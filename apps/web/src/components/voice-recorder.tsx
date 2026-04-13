'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2, Mic, Trash2 } from 'lucide-react'
import { uploadVoiceFile, transcribeVoice } from '@/lib/ai-chat-api'
import { cn } from '@/lib/utils'

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void
  disabled?: boolean
  maxDuration?: number // 最大录音时长（秒），默认 60
  className?: string
}

type RecordingStatus = 'idle' | 'starting' | 'recording' | 'uploading' | 'transcribing'
type StopAction = 'send' | 'cancel'

const MIN_RECORDING_MS = 350
const CANCEL_SLOP_PX = 20

export function VoiceRecorder({
  onTranscriptionComplete,
  disabled = false,
  maxDuration = 60,
  className,
}: VoiceRecorderProps) {
  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [duration, setDuration] = useState(0)
  const [cancelIntent, setCancelIntent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const statusRef = useRef<RecordingStatus>('idle')
  const durationRef = useRef(0)
  const cancelIntentRef = useRef(false)
  const mountedRef = useRef(true)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const pressTargetRef = useRef<HTMLButtonElement | null>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const pressStartedAtRef = useRef<number | null>(null)
  const stopActionRef = useRef<StopAction | null>(null)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const updateDuration = useCallback((next: number) => {
    durationRef.current = next
    setDuration(next)
  }, [])

  const updateCancelIntent = useCallback((next: boolean) => {
    cancelIntentRef.current = next
    setCancelIntent(next)
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const clearPressState = useCallback(() => {
    activePointerIdRef.current = null
    pressStartedAtRef.current = null
    stopActionRef.current = null
    updateCancelIntent(false)
  }, [updateCancelIntent])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimer()
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.onstop = null
        try {
          mediaRecorderRef.current.stop()
        } catch {
          // ignore
        }
      }
      mediaRecorderRef.current = null
      stopStream()
    }
  }, [clearTimer, stopStream])

  const stopRecording = useCallback(
    (action: StopAction) => {
      stopActionRef.current = action
      clearTimer()

      const recorder = mediaRecorderRef.current
      if (!recorder) {
        if (statusRef.current !== 'starting') {
          stopStream()
          clearPressState()
          updateDuration(0)
          setStatus('idle')
        }
        return
      }

      if (recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch {
          stopStream()
          mediaRecorderRef.current = null
          clearPressState()
          updateDuration(0)
          setStatus('idle')
        }
      }
    },
    [clearPressState, clearTimer, stopStream, updateDuration]
  )

  const transcribeAudio = useCallback(
    async (audioBlob: Blob) => {
      try {
        setStatus('uploading')
        const uploadResult = await uploadVoiceFile(audioBlob)
        if (!mountedRef.current) return

        setStatus('transcribing')
        const transcriptionResult = await transcribeVoice(uploadResult.fileId)
        if (!mountedRef.current) return

        const text = transcriptionResult.text.trim()
        if (text) {
          onTranscriptionComplete(text)
        } else {
          setError('没有识别到清晰语音，请再试一次')
        }
      } catch (err) {
        if (!mountedRef.current) return
        const message = err instanceof Error ? err.message : '语音识别失败'
        setError(message)
      }

      if (!mountedRef.current) return
      updateDuration(0)
      setStatus('idle')
    },
    [onTranscriptionComplete, updateDuration]
  )

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setStatus('starting')
      updateDuration(0)
      updateCancelIntent(false)
      chunksRef.current = []

      if (
        typeof window === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === 'undefined'
      ) {
        throw new Error('当前浏览器不支持语音录制')
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ]
      let supportedMimeType = ''
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          supportedMimeType = type
          break
        }
      }

      if (!supportedMimeType) {
        stopStream()
        throw new Error('浏览器不支持音频录制')
      }

      if (stopActionRef.current) {
        const action = stopActionRef.current
        stopStream()
        clearPressState()
        updateDuration(0)
        setStatus('idle')
        if (action === 'send') {
          setError('按住时间太短，请重新录音')
        }
        return
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: supportedMimeType })
        const action = stopActionRef.current ?? 'send'

        clearTimer()
        stopStream()
        mediaRecorderRef.current = null
        clearPressState()

        if (!mountedRef.current) {
          return
        }

        if (action === 'cancel' || blob.size === 0) {
          updateDuration(0)
          setStatus('idle')
          return
        }

        void transcribeAudio(blob)
      }

      mediaRecorder.start(250)
      setStatus('recording')
      updateDuration(0)
      timerRef.current = setInterval(() => {
        const next = durationRef.current + 1
        updateDuration(next)

        if (next >= maxDuration) {
          stopRecording('send')
        }
      }, 1000)
    } catch (err) {
      stopStream()
      mediaRecorderRef.current = null
      clearPressState()
      clearTimer()
      updateDuration(0)
      const message = err instanceof Error ? err.message : '无法启动录音'
      setError(message)
      setStatus('idle')
    }
  }, [
    clearPressState,
    clearTimer,
    maxDuration,
    stopRecording,
    stopStream,
    transcribeAudio,
    updateCancelIntent,
    updateDuration,
  ])

  const finishPress = useCallback(
    (action: StopAction) => {
      const pressStartedAt = pressStartedAtRef.current
      const elapsed = pressStartedAt ? Date.now() - pressStartedAt : 0
      const nextAction =
        action === 'send' && elapsed < MIN_RECORDING_MS ? 'cancel' : action

      if (action === 'send' && nextAction === 'cancel') {
        setError('按住时间太短，请重新录音')
      }

      stopRecording(nextAction)
    },
    [stopRecording]
  )

  const shouldCancelAtPosition = useCallback((clientX: number, clientY: number) => {
    const rect = pressTargetRef.current?.getBoundingClientRect()
    if (!rect) return false

    return (
      clientY < rect.top - CANCEL_SLOP_PX ||
      clientX < rect.left - CANCEL_SLOP_PX ||
      clientX > rect.right + CANCEL_SLOP_PX ||
      clientY > rect.bottom + CANCEL_SLOP_PX
    )
  }, [])

  const beginPress = useCallback(() => {
    if (disabled || statusRef.current !== 'idle') {
      return
    }

    pressStartedAtRef.current = Date.now()
    stopActionRef.current = null
    void startRecording()
  }, [disabled, startRecording])

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || statusRef.current !== 'idle') {
      return
    }

    activePointerIdRef.current = event.pointerId
    pressTargetRef.current = event.currentTarget
    event.currentTarget.focus()

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // ignore
    }

    beginPress()
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (
      activePointerIdRef.current !== event.pointerId ||
      (statusRef.current !== 'starting' && statusRef.current !== 'recording')
    ) {
      return
    }

    updateCancelIntent(
      shouldCancelAtPosition(event.clientX, event.clientY)
    )
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }

    finishPress(cancelIntentRef.current ? 'cancel' : 'send')
  }

  const handlePointerCancel = () => {
    if (statusRef.current === 'starting' || statusRef.current === 'recording') {
      finishPress('cancel')
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.repeat) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      beginPress()
      return
    }

    if (
      event.key === 'Escape' &&
      (statusRef.current === 'starting' || statusRef.current === 'recording')
    ) {
      event.preventDefault()
      finishPress('cancel')
    }
  }

  const handleKeyUp = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()

    if (statusRef.current === 'starting' || statusRef.current === 'recording') {
      finishPress(cancelIntentRef.current ? 'cancel' : 'send')
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const processing = status === 'uploading' || status === 'transcribing'
  const busy = status === 'starting' || processing
  const showHud = status !== 'idle'

  const buttonLabel =
    status === 'starting'
      ? '准备录音...'
      : status === 'recording'
        ? cancelIntent
          ? '松开取消'
          : '松开发送'
        : status === 'uploading'
          ? '上传语音...'
          : status === 'transcribing'
            ? '识别中...'
            : '按住说话'

  const hintText =
    status === 'starting'
      ? '正在请求麦克风权限'
      : status === 'recording'
        ? cancelIntent
          ? '松开将取消本次录音'
          : '松开发送，上滑取消'
        : status === 'uploading' || status === 'transcribing'
          ? '识别结果会自动回填到输入框'
          : disabled
            ? '当前状态下不可使用语音输入'
            : '按住录音，松开发送'

  const hudTitle =
    status === 'recording'
      ? cancelIntent
        ? '松开取消'
        : '正在录音'
      : status === 'uploading'
        ? '上传音频'
        : status === 'transcribing'
          ? '识别语音'
          : '准备录音'

  const hudSubtitle =
    status === 'recording'
      ? cancelIntent
        ? '移回按钮区域可继续录音'
        : `${formatDuration(duration)} · 向上滑动可取消`
      : status === 'uploading'
        ? '正在发送语音文件'
        : status === 'transcribing'
          ? '识别完成后会写入输入框'
          : '首次使用可能会弹出权限提示'

  return (
    <div className={cn('relative flex w-full flex-col gap-2', className)}>
      <div
        aria-live="polite"
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 z-10 mb-3 w-full max-w-[18rem] -translate-x-1/2 transition-all duration-200',
          showHud ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        )}
      >
        <div
          className={cn(
            'rounded-[28px] border px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl',
            cancelIntent
              ? 'border-red-500/25 bg-red-500/12'
              : 'border-line-glass bg-surface-glass/95'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                cancelIntent
                  ? 'bg-red-500/18 text-red-500'
                  : 'bg-accent-primary/10 text-accent-primary'
              )}
            >
              {cancelIntent ? (
                <Trash2 className="h-5 w-5" />
              ) : busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-content-primary">
                {hudTitle}
              </div>
              <div className="text-xs text-content-secondary">{hudSubtitle}</div>
            </div>
          </div>
        </div>
      </div>

      <button
        ref={pressTargetRef}
        type="button"
        disabled={disabled || processing}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onContextMenu={(event) => event.preventDefault()}
        className={cn(
          'h-14 w-full select-none rounded-[20px] border text-[15px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/35 touch-none',
          disabled || processing
            ? 'cursor-not-allowed border-line-glass bg-surface-tertiary/45 text-content-tertiary'
            : status === 'recording'
              ? cancelIntent
                ? 'cursor-pointer border-red-500/30 bg-red-500/10 text-red-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
                : 'cursor-pointer border-accent-primary/15 bg-surface-primary/85 text-content-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_12px_28px_rgba(0,0,0,0.08)]'
              : 'cursor-pointer border-line-glass bg-surface-tertiary/65 text-content-secondary hover:bg-surface-tertiary/80'
        )}
        aria-label={buttonLabel}
      >
        {buttonLabel}
      </button>

      <div className="flex items-center justify-between px-1 text-[11px] text-content-tertiary">
        <span>{hintText}</span>
        <span
          className={cn(
            'tabular-nums',
            status === 'recording' ? 'text-accent-primary' : 'text-content-tertiary'
          )}
        >
          {status === 'recording'
            ? formatDuration(duration)
            : `最长 ${formatDuration(maxDuration)}`}
        </span>
      </div>

      {error && <div className="px-1 text-xs text-red-500">{error}</div>}
    </div>
  )
}
