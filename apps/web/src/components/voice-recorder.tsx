'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadVoiceFile, transcribeVoice } from '@/lib/ai-chat-api'

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void
  disabled?: boolean
  maxDuration?: number // 最大录音时长（秒），默认 60
}

type RecordingStatus = 'idle' | 'recording' | 'preview' | 'uploading' | 'transcribing'

export function VoiceRecorder({
  onTranscriptionComplete,
  disabled = false,
  maxDuration = 60,
}: VoiceRecorderProps) {
  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>( null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // 清理函数
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  // 组件卸载时清理
  useEffect(() => {
    return cleanup
  }, [cleanup])

  // 开始录音
  const startRecording = async () => {
    try {
      setError(null)
      chunksRef.current = []

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // 检测支持的 MIME 类型
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
        throw new Error('浏览器不支持音频录制')
      }

      // 创建 MediaRecorder
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
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setStatus('preview')
      }

      mediaRecorder.start(1000) // 每秒收集一次数据
      setStatus('recording')
      setDuration(0)

      // 开始计时
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)
    } catch (err) {
      const message = err instanceof Error ? err.message : '无法启动录音'
      setError(message)
      setStatus('idle')
    }
  }

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  // 重新录制
  const resetRecording = () => {
    cleanup()
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    setStatus('idle')
    setError(null)
  }

  // 上传并识别
  const uploadAndTranscribe = async () => {
    if (!audioBlob) return

    try {
      setStatus('uploading')
      setError(null)

      // 上传音频文件
      const uploadResult = await uploadVoiceFile(audioBlob)

      setStatus('transcribing')

      // 语音转文本
      const transcriptionResult = await transcribeVoice(uploadResult.fileId)

      // 完成识别，调用回调
      onTranscriptionComplete(transcriptionResult.text)

      // 重置状态
      resetRecording()
    } catch (err) {
      const message = err instanceof Error ? err.message : '语音识别失败'
      setError(message)
      setStatus('preview')
    }
  }

  // 格式化时长显示
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 录音按钮 */}
      {status === 'idle' && (
        <Button
          variant="ghost"
          size="icon"
          onClick={startRecording}
          disabled={disabled}
          className="h-10 w-10 rounded-full"
          title="开始录音"
        >
          <Mic className="h-5 w-5" />
        </Button>
      )}

      {/* 录音中 */}
      {status === 'recording' && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 rounded-lg">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-600">
              {formatDuration(duration)}
            </span>
          </div>
          <Button
            variant="destructive"
            size="icon"
            onClick={stopRecording}
            className="h-10 w-10 rounded-full"
            title="停止录音"
          >
            <Square className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* 预览 */}
      {status === 'preview' && audioUrl && (
        <div className="flex flex-col gap-2 w-full max-w-md">
          <div className="flex items-center gap-3">
            <audio src={audioUrl} controls className="w-full h-10" />
            <span className="text-sm text-muted-foreground">
              {formatDuration(duration)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetRecording}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              重新录制
            </Button>
            <Button
              size="sm"
              onClick={uploadAndTranscribe}
              className="flex items-center gap-1"
            >
              发送识别
            </Button>
          </div>
        </div>
      )}

      {/* 上传中 */}
      {status === 'uploading' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 rounded-lg">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-blue-600">上传音频...</span>
        </div>
      )}

      {/* 识别中 */}
      {status === 'transcribing' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-lg">
          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-green-600">语音识别中...</span>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="text-sm text-destructive text-center">{error}</div>
      )}
    </div>
  )
}