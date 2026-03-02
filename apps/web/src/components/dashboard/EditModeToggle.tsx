'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit3, Eye, Plus, LayoutTemplate, PenSquare, CloudUpload, Loader2 } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { useFloatingActions } from '@/components/providers/FloatingActionsProvider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'

interface EditModeActionsProps {
  onAddCard: () => void
  onSelectLayout: () => void
  onSyncToCloud?: () => Promise<void>
}

function EditModeActions({ onAddCard, onSelectLayout, onSyncToCloud }: EditModeActionsProps) {
  const { isEditMode, toggleEditMode } = useDashboard()
  const router = useRouter()
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')

  const handleSync = useCallback(async () => {
    if (!onSyncToCloud) return
    setSyncStatus('syncing')
    try {
      await onSyncToCloud()
      setSyncStatus('success')
      setTimeout(() => setSyncStatus('idle'), 2000)
    } catch {
      setSyncStatus('error')
      setTimeout(() => setSyncStatus('idle'), 2000)
    }
  }, [onSyncToCloud])

  const handleGoToBlogEditor = () => {
    router.push('/blog/editor')
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 博客编辑入口：始终展示 */}
      <motion.button
        type="button"
        onClick={handleGoToBlogEditor}
        initial={{ scale: 0, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 20 }}
        className="flex items-center gap-1.5 rounded-full bg-accent-primary px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-accent-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/70"
        aria-label="写文章"
      >
        <PenSquare className="h-3.5 w-3.5" />
        <span>写文章</span>
      </motion.button>

      {/* 编辑模式下显示的额外按钮 - 在编辑按钮上方 */}
      <AnimatePresence>
        {isEditMode && (
          <>
            {/* 同步到云端 */}
            {onSyncToCloud && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
                className="flex flex-col items-center gap-1"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleSync}
                      disabled={syncStatus === 'syncing'}
                      className="flex h-12 w-12 items-center justify-center rounded-full border border-line-primary bg-surface-primary text-content-secondary shadow-lg transition-all hover:bg-surface-hover disabled:opacity-60"
                      aria-label="同步到云端"
                    >
                      {syncStatus === 'syncing' ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <CloudUpload className="h-5 w-5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    {syncStatus === 'success' ? '已同步' : syncStatus === 'error' ? '同步失败' : '同步到云端'}
                  </TooltipContent>
                </Tooltip>
                {syncStatus === 'success' && (
                  <span className="text-xs text-green-600 dark:text-green-400">已同步</span>
                )}
                {syncStatus === 'error' && (
                  <span className="text-xs text-red-600 dark:text-red-400">同步失败</span>
                )}
              </motion.div>
            )}
            {/* 选择布局模板按钮 */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onSelectLayout}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-line-primary bg-surface-primary text-content-secondary shadow-lg transition-all hover:bg-surface-hover"
                    aria-label="选择布局模板"
                  >
                    <LayoutTemplate className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">选择布局模板</TooltipContent>
              </Tooltip>
            </motion.div>

            {/* 插入组件按钮 */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 20 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onAddCard}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-line-primary bg-surface-primary text-content-secondary shadow-lg transition-all hover:bg-surface-hover"
                    aria-label="插入组件"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">插入组件</TooltipContent>
              </Tooltip>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 编辑模式切换按钮 */}
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
    </div>
  )
}

interface EditModeToggleProps {
  onAddCard: () => void
  onSelectLayout: () => void
  onSyncToCloud?: () => Promise<void>
}

export function EditModeToggle({ onAddCard, onSelectLayout, onSyncToCloud }: EditModeToggleProps) {
  const { setExtraActions } = useFloatingActions()

  useEffect(() => {
    setExtraActions(
      <EditModeActions
        onAddCard={onAddCard}
        onSelectLayout={onSelectLayout}
        onSyncToCloud={onSyncToCloud}
      />
    )
    return () => setExtraActions(null)
  }, [setExtraActions, onAddCard, onSelectLayout, onSyncToCloud])

  return null
}
