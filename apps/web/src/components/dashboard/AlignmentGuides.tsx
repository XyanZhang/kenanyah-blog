'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlignmentLine } from '@/hooks/useAlignmentGuides'

interface AlignmentGuidesProps {
  lines: AlignmentLine[]
  isVisible: boolean
}

export function AlignmentGuides({ lines, isVisible }: AlignmentGuidesProps) {
  if (!isVisible || lines.length === 0) {
    return null
  }

  return (
    <div className="pointer-events-none absolute left-0 top-0 z-999 h-full w-full overflow-visible">
      <AnimatePresence>
        {lines.map((line, index) => (
          <motion.div
            key={`${line.type}-${line.position}-${index}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute bg-blue-500"
            style={
              line.type === 'vertical'
                ? {
                    left: `${line.position}px`,
                    top: `${line.start}px`,
                    width: '2px',
                    height: `${line.end - line.start}px`,
                    backgroundImage:
                      'repeating-linear-gradient(0deg, #3b82f6, #3b82f6 6px, transparent 6px, transparent 10px)',
                  }
                : {
                    left: `${line.start}px`,
                    top: `${line.position}px`,
                    width: `${line.end - line.start}px`,
                    height: '2px',
                    backgroundImage:
                      'repeating-linear-gradient(90deg, #3b82f6, #3b82f6 6px, transparent 6px, transparent 10px)',
                  }
            }
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
