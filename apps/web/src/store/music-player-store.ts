'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MusicCardConfig } from '@blog/types'

interface MusicPlayerState {
  config: MusicCardConfig | null
  sourceCardId: string | null
  currentIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  progress: number
  volume: number
  isMuted: boolean
}

interface MusicPlayerActions {
  setConfigAndPlay: (config: MusicCardConfig, cardId: string) => void
  play: () => void
  pause: () => void
  toggle: () => void
  setVolume: (volume: number) => void
  setMuted: (muted: boolean) => void
  seek: (percentage: number) => void
  nextTrack: () => void
  prevTrack: () => void
  syncFromAudio: (currentTime: number, duration: number) => void
  clearSession: () => void
}

type MusicPlayerStore = MusicPlayerState & MusicPlayerActions

const initialState: MusicPlayerState = {
  config: null,
  sourceCardId: null,
  currentIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 215,
  progress: 0,
  volume: 80,
  isMuted: false,
}

export const useMusicPlayerStore = create<MusicPlayerStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setConfigAndPlay: (config, cardId) => {
        // 深拷贝 config，避免依赖外部引用，确保 playlist 等完整写入 store
        const configCopy = JSON.parse(JSON.stringify(config)) as MusicCardConfig
        set({
          config: configCopy,
          sourceCardId: cardId,
          currentIndex: 0,
          isPlaying: true,
          currentTime: 0,
          progress: 0,
          duration: 215,
        })
      },

      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),
      toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),

      setVolume: (volume) => set({ volume }),
      setMuted: (isMuted) => set({ isMuted }),

      seek: (percentage) => {
        const { duration } = get()
        const currentTime = Math.max(0, Math.min(percentage * duration, duration))
        set({
          currentTime,
          progress: duration > 0 ? (currentTime / duration) * 100 : 0,
        })
      },

      nextTrack: () => {
        const { config, currentIndex } = get()
        if (!config) return
        const playlist = config.playlist || []
        if (playlist.length <= 1) return
        const nextIndex = (currentIndex + 1) % playlist.length
        set({
          currentIndex: nextIndex,
          isPlaying: true,
          currentTime: 0,
          progress: 0,
        })
      },

      prevTrack: () => {
        const { config, currentIndex } = get()
        if (!config) return
        const playlist = config.playlist || []
        if (playlist.length <= 1) return
        const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length
        set({
          currentIndex: prevIndex,
          isPlaying: true,
          currentTime: 0,
          progress: 0,
        })
      },

      syncFromAudio: (currentTime, duration) => {
        const d = duration || 215
        set({
          currentTime,
          duration: d,
          progress: d > 0 ? (currentTime / d) * 100 : 0,
        })
      },

      clearSession: () => {
        set({
          config: null,
          sourceCardId: null,
          currentIndex: 0,
          isPlaying: false,
          currentTime: 0,
          progress: 0,
        })
      },
    }),
    {
      name: 'blog-music-player',
      partialize: (state) => ({ volume: state.volume, isMuted: state.isMuted }),
    }
  )
)
