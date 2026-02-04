'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAlignmentStore } from '@/store/alignment-store'
import { useDashboard } from '@/hooks/useDashboard'

export function RootAlignmentGuides() {
  const alignmentLines = useAlignmentStore((s) => s.alignmentLines)
  const activeId = useAlignmentStore((s) => s.activeId)
  const { isEditMode } = useDashboard()

  const isVisible = isEditMode && activeId !== null && alignmentLines.length > 0

  if (!isVisible) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-visible">
      <AnimatePresence>
        {alignmentLines.map((line) => (
          <motion.div
            key={`${line.type}-${Math.round(line.position)}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute"
            style={
              line.type === 'vertical'
                ? {
                    left: `${line.position}px`,
                    top: `${line.start}px`,
                    width: '2px',
                    height: `${line.end - line.start}px`,
                    backgroundImage:
                      'repeating-linear-gradient(0deg, var(--color-primary), var(--color-primary) 6px, transparent 6px, transparent 10px)',
                  }
                : {
                    left: `${line.start}px`,
                    top: `${line.position}px`,
                    width: `${line.end - line.start}px`,
                    height: '2px',
                    backgroundImage:
                      'repeating-linear-gradient(90deg, var(--color-primary), var(--color-primary) 6px, transparent 6px, transparent 10px)',
                  }
            }
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
