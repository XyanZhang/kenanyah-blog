'use client'

import { motion } from 'framer-motion'
import { Edit3, Eye } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { Button } from '@/components/ui'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'

export function EditModeToggle() {
  const { isEditMode, toggleEditMode } = useDashboard()

  return (
    <motion.div
      className="fixed bottom-8 right-8 z-50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="lg"
            variant={isEditMode ? 'default' : 'outline'}
            onClick={toggleEditMode}
            className="h-14 w-14 rounded-full shadow-lg"
          >
            {isEditMode ? (
              <Eye className="h-6 w-6" />
            ) : (
              <Edit3 className="h-6 w-6" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          {isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
        </TooltipContent>
      </Tooltip>
    </motion.div>
  )
}
