'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlay, FiPause, FiMusic, FiSkipBack, FiSkipForward, FiX, FiChevronDown } from 'react-icons/fi'
import { useMusicPlayerStore } from '@/store/music-player-store'
import { LiquidGlassFilter } from './LiquidGlassFilter'

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface GlobalMusicBarProps {
  isExpanded?: boolean
  onCollapse?: () => void
}

export function GlobalMusicBar({ isExpanded = true, onCollapse }: GlobalMusicBarProps) {
  const config = useMusicPlayerStore((s) => s.config)
  const currentIndex = useMusicPlayerStore((s) => s.currentIndex)
  const isPlaying = useMusicPlayerStore((s) => s.isPlaying)
  const progress = useMusicPlayerStore((s) => s.progress)
  const currentTime = useMusicPlayerStore((s) => s.currentTime)
  const duration = useMusicPlayerStore((s) => s.duration)
  const toggle = useMusicPlayerStore((s) => s.toggle)
  const nextTrack = useMusicPlayerStore((s) => s.nextTrack)
  const prevTrack = useMusicPlayerStore((s) => s.prevTrack)
  const seek = useMusicPlayerStore((s) => s.seek)
  const clearSession = useMusicPlayerStore((s) => s.clearSession)

  if (!config) return null

  const playlist = config.playlist || []
  const hasPlaylist = playlist.length > 0
  const currentTrack = hasPlaylist ? playlist[currentIndex] : null
  const title = currentTrack?.title || config.title || '未知曲目'
  const artist = currentTrack?.artist || config.artist

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    seek(percentage)
  }

  return (
    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          key="music-bar"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-2 sm:px-4 sm:pb-3 text-content-primary"
        >
          <LiquidGlassFilter
            width={896}
            height={72}
            radius={31}
            bezelWidth={29}
            blur={1}
            scaleRatio={1}
            specularOpacity={0.4}
            specularSaturation={6}
            className="max-w-4xl mx-auto rounded-[1.35rem] border border-white/25 bg-surface-primary/65 shadow-[0_10px_40px_rgba(0,0,0,0.28)]"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/32 via-white/8 to-white/4"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/45 via-white/10 to-transparent"
              aria-hidden
            />
            <div className="relative flex items-center gap-4 px-4 py-2.5">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shrink-0 shadow-[0_3px_12px_rgba(0,0,0,0.28)]">
                  <FiMusic className="text-content-inverse" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-content-primary truncate">{title}</p>
                  {artist && <p className="text-xs text-content-secondary truncate">{artist}</p>}
                </div>
              </div>

              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={prevTrack}
                    disabled={!hasPlaylist || playlist.length <= 1}
                    className="p-1.5 rounded-full text-content-primary hover:bg-white/20 hover:text-accent-primary transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    aria-label="上一首"
                  >
                    <FiSkipBack size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={toggle}
                    className="w-10 h-10 rounded-full bg-accent-primary text-content-inverse flex items-center justify-center hover:opacity-90 transition-opacity shadow-[0_3px_10px_rgba(0,0,0,0.25)]"
                    aria-label={isPlaying ? '暂停' : '播放'}
                  >
                    {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} className="ml-0.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={nextTrack}
                    disabled={!hasPlaylist || playlist.length <= 1}
                    className="p-1.5 rounded-full text-content-primary hover:bg-white/20 hover:text-accent-primary transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    aria-label="下一首"
                  >
                    <FiSkipForward size={18} />
                  </button>
                </div>
                {config.showProgress !== false && (
                  <div className="flex items-center gap-2 w-48">
                    <span className="text-xs text-content-secondary tabular-nums">{formatTime(currentTime)}</span>
                    <div
                      role="progressbar"
                      className="h-1 flex-1 bg-white/30 rounded-full cursor-pointer overflow-hidden"
                      onClick={handleSeek}
                    >
                      <motion.div
                        className="h-full bg-accent-primary rounded-full"
                        style={{ width: `${progress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <span className="text-xs text-content-secondary tabular-nums">{formatTime(duration)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/"
                  className="text-xs text-content-secondary hover:text-accent-primary transition-colors"
                >
                  返回首页
                </Link>
                {onCollapse && (
                  <button
                    type="button"
                    onClick={onCollapse}
                    className="p-1.5 rounded-full text-content-primary hover:bg-white/20 hover:text-accent-primary transition-colors"
                    aria-label="收起播放栏"
                  >
                    <FiChevronDown size={18} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearSession}
                  className="p-1.5 rounded-full text-content-primary hover:bg-white/20 hover:text-accent-primary transition-colors"
                  aria-label="关闭"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>
          </LiquidGlassFilter>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
