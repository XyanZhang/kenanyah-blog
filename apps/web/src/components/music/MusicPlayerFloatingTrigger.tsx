'use client'

import { motion } from 'framer-motion'
import { FiMusic } from 'react-icons/fi'

interface MusicPlayerFloatingTriggerProps {
  isPlaying: boolean
  onClick: () => void
}

export function MusicPlayerFloatingTrigger({ isPlaying, onClick }: MusicPlayerFloatingTriggerProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="fixed bottom-6 left-6 z-[60] w-12 h-12 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary text-content-inverse shadow-lg flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-primary hover:scale-105 active:scale-95 transition-transform"
      aria-label="打开音乐播放器"
    >
      <motion.span
        animate={
          isPlaying
            ? {
                scale: [1, 1.15, 1],
                transition: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' },
              }
            : { scale: 1 }
        }
        className="flex items-center justify-center"
      >
        <FiMusic size={22} strokeWidth={2} />
      </motion.span>
      {/* 播放时的外圈脉动光晕 */}
      {isPlaying && (
        <motion.span
          className="absolute inset-0 rounded-full bg-accent-primary/40"
          animate={{
            scale: [1, 1.4, 1.4],
            opacity: [0.5, 0, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: 'easeOut',
          }}
          aria-hidden
        />
      )}
    </motion.button>
  )
}
