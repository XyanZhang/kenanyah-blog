'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Edit3, Eye } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { useFloatingActions } from '@/components/providers/FloatingActionsProvider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'

function EditModeButton() {
  const { isEditMode, toggleEditMode } = useDashboard()

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleEditMode}
            className={`
              flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all
              ${isEditMode
                ? 'bg-accent-primary text-white'
                : 'bg-surface-primary text-content-secondary hover:bg-surface-hover border border-line-primary'
              }
            `}
            aria-label={isEditMode ? '退出编辑模式' : '进入编辑模式'}
          >
            {isEditMode ? (
              <Eye className="h-5 w-5" />
            ) : (
              <Edit3 className="h-5 w-5" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">
          {isEditMode ? '退出编辑模式' : '进入编辑模式'}
        </TooltipContent>
      </Tooltip>
    </motion.div>
  )
}

export function EditModeToggle() {
  const { setExtraActions } = useFloatingActions()

  useEffect(() => {
    setExtraActions(<EditModeButton />)
    return () => setExtraActions(null)
  }, [setExtraActions])

  return null
}
