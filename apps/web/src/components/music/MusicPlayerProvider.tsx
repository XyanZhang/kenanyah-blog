'use client'

import { useRef, useEffect } from 'react'
import { useMusicPlayerStore } from '@/store/music-player-store'

function getCurrentAudioUrl(
  config: { playlist?: Array<{ audioUrl: string }>; audioUrl?: string } | null,
  currentIndex: number
): string {
  if (!config) return ''
  const playlist = config.playlist || []
  if (playlist.length > 0) {
    const track = playlist[currentIndex]
    return track?.audioUrl || ''
  }
  return config.audioUrl || ''
}

export function MusicPlayerProvider() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const config = useMusicPlayerStore((s) => s.config)
  const currentIndex = useMusicPlayerStore((s) => s.currentIndex)
  const isPlaying = useMusicPlayerStore((s) => s.isPlaying)
  const volume = useMusicPlayerStore((s) => s.volume)
  const isMuted = useMusicPlayerStore((s) => s.isMuted)
  const currentTime = useMusicPlayerStore((s) => s.currentTime)
  const syncFromAudio = useMusicPlayerStore((s) => s.syncFromAudio)
  const nextTrack = useMusicPlayerStore((s) => s.nextTrack)
  const pause = useMusicPlayerStore((s) => s.pause)

  const src = getCurrentAudioUrl(config, currentIndex)

  // Sync src to audio element（仅换曲时更新 src 并 load，不依赖 isPlaying，避免暂停时 load 导致进度重置）
  useEffect(() => {
    const el = audioRef.current
    if (!el || !config) return
    el.src = src || ''
    if (src) {
      el.load()
      const playing = useMusicPlayerStore.getState().isPlaying
      if (playing) el.play().catch(() => {})
    }
  }, [config, currentIndex, src])

  // Sync play/pause
  useEffect(() => {
    const el = audioRef.current
    if (!el || !config) return
    if (isPlaying && src) {
      el.play().catch(() => {})
    } else {
      el.pause()
    }
  }, [isPlaying, config, src])

  // Sync volume
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.volume = isMuted ? 0 : volume / 100
  }, [volume, isMuted])

  // Sync seek: store currentTime -> audio (e.g. after user seek)
  useEffect(() => {
    const el = audioRef.current
    if (!el || !config || !src) return
    if (Math.abs(el.currentTime - currentTime) > 0.5) {
      el.currentTime = currentTime
    }
  }, [currentTime, config, src])

  const handleTimeUpdate = () => {
    const el = audioRef.current
    if (!el) return
    syncFromAudio(el.currentTime, el.duration || 0)
  }

  const handleLoadedMetadata = () => {
    const el = audioRef.current
    if (!el) return
    syncFromAudio(el.currentTime, el.duration || 0)
  }

  const handleEnded = () => {
    const playlist = config?.playlist || []
    if (playlist.length > 1) {
      nextTrack()
    } else {
      pause()
    }
  }

  if (!config) return null

  return (
    <audio
      ref={audioRef}
      src={src}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onEnded={handleEnded}
      className="hidden"
      aria-hidden
    />
  )
}
