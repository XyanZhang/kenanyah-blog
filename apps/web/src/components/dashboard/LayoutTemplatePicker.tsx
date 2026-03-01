'use client'

import { useState, useImperativeHandle, forwardRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Layout,
  Minus,
  LayoutGrid,
  Camera,
  BarChart3,
  UserCircle,
  Check,
  Save,
  Trash2,
  Loader2,
} from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { useNavStore } from '@/store/nav-store'
import { useHomeCanvasStore } from '@/store/home-canvas-store'
import { Button } from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui'
import { layoutTemplates, LayoutTemplate, getTemplateById } from '@/lib/dashboard/layout-templates'
import { getHomeTemplates, getHomeTemplate, deleteHomeTemplate } from '@/lib/home-api'
import type { HomeTemplateSummary } from '@/lib/home-api'
import { SaveAsTemplateDialog } from './SaveAsTemplateDialog'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Layout,
  Minus,
  LayoutGrid,
  Camera,
  BarChart3,
  UserCircle,
}

function TemplatePreviewCard({
  template,
  isSelected,
  onSelect,
}: {
  template: LayoutTemplate
  isSelected: boolean
  onSelect: () => void
}) {
  const Icon = iconMap[template.icon] || Layout

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className={`
        relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 text-center transition-all
        ${isSelected
          ? 'border-accent-primary bg-surface-selected shadow-md'
          : 'border-line-primary bg-surface-primary hover:border-line-hover hover:bg-surface-hover'
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {isSelected && (
        <motion.div
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent-primary"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <Check className="h-4 w-4 text-white" />
        </motion.div>
      )}

      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface-secondary">
        <span className="text-3xl">{template.preview}</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-center gap-2">
          <Icon className="h-4 w-4 text-content-tertiary" />
          <span className="font-medium text-content-primary">{template.name}</span>
        </div>
        <p className="text-xs text-content-muted">{template.description}</p>
      </div>

      <div className="text-xs text-content-dimmed">
        {template.cards.length} 个卡片
      </div>
    </motion.button>
  )
}

export interface LayoutTemplatePickerHandle {
  open: () => void
}

function UserTemplateCard({
  template,
  isSelected,
  onSelect,
  onDelete,
  isDeleting,
}: {
  template: HomeTemplateSummary
  isSelected: boolean
  onSelect: () => void
  onDelete: (e: React.MouseEvent) => void
  isDeleting: boolean
}) {
  return (
    <motion.div
      className={`
        relative flex flex-col rounded-xl border-2 p-4 text-left transition-all
        ${isSelected
          ? 'border-accent-primary bg-surface-selected shadow-md'
          : 'border-line-primary bg-surface-primary hover:border-line-hover hover:bg-surface-hover'
        }
      `}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 flex-col gap-1 text-left"
      >
        <span className="font-medium text-content-primary">{template.name}</span>
        {template.description && (
          <span className="text-xs text-content-muted line-clamp-2">
            {template.description}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        className="absolute right-2 top-2 rounded p-1.5 text-content-tertiary hover:bg-surface-hover hover:text-red-600 disabled:opacity-50"
        aria-label="删除模板"
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
    </motion.div>
  )
}

export const LayoutTemplatePickerDialog = forwardRef<LayoutTemplatePickerHandle>(
  function LayoutTemplatePickerDialog(_props, ref) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
    const [selectedUserTemplateId, setSelectedUserTemplateId] = useState<string | null>(null)
    const [userTemplates, setUserTemplates] = useState<HomeTemplateSummary[]>([])
    const [loadingUserTemplates, setLoadingUserTemplates] = useState(false)
    const [applyingId, setApplyingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [showSaveAsDialog, setShowSaveAsDialog] = useState(false)

    const { layout, applyLayoutTemplate, setLayout } = useDashboard()
    const { config: navConfig } = useNavStore()
    const { scale } = useHomeCanvasStore()

    const fetchUserTemplates = useCallback(async () => {
      setLoadingUserTemplates(true)
      try {
        const list = await getHomeTemplates()
        setUserTemplates(list)
      } catch {
        setUserTemplates([])
      } finally {
        setLoadingUserTemplates(false)
      }
    }, [])

    useImperativeHandle(ref, () => ({
      open: () => setIsOpen(true),
    }))

    useEffect(() => {
      if (isOpen) {
        setSelectedPresetId(null)
        setSelectedUserTemplateId(null)
        fetchUserTemplates()
      }
    }, [isOpen, fetchUserTemplates])

    const selectedPreset = selectedPresetId ? getTemplateById(selectedPresetId) : null

    const handleApply = async () => {
      if (selectedPreset) {
        applyLayoutTemplate(selectedPreset)
        setIsOpen(false)
        setSelectedPresetId(null)
        setSelectedUserTemplateId(null)
        return
      }
      if (selectedUserTemplateId) {
        setApplyingId(selectedUserTemplateId)
        try {
          const data = await getHomeTemplate(selectedUserTemplateId)
          setLayout(data.layout)
          if (data.nav) useNavStore.getState().setConfigFromApi(data.nav)
          if (data.canvas?.scale != null) useHomeCanvasStore.getState().setScale(data.canvas.scale)
          setIsOpen(false)
          setSelectedUserTemplateId(null)
        } finally {
          setApplyingId(null)
        }
      }
    }

    const handleDeleteUserTemplate = async (id: string) => {
      setDeletingId(id)
      try {
        await deleteHomeTemplate(id)
        setUserTemplates((prev) => prev.filter((t) => t.id !== id))
        if (selectedUserTemplateId === id) setSelectedUserTemplateId(null)
      } finally {
        setDeletingId(null)
      }
    }

    const hasSelection = !!selectedPresetId || !!selectedUserTemplateId

    return (
      <>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>选择布局模板</DialogTitle>
              <DialogDescription>
                选择预设或「我的模板」快速应用，也可将当前布局另存为模板
              </DialogDescription>
            </DialogHeader>

            {/* 我的模板 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-content-secondary">我的模板</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveAsDialog(true)}
                  disabled={!layout}
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  另存为模板
                </Button>
              </div>
              {loadingUserTemplates ? (
                <div className="flex items-center gap-2 py-4 text-content-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">加载中…</span>
                </div>
              ) : userTemplates.length === 0 ? (
                <p className="py-4 text-sm text-content-muted">暂无保存的模板，可先将当前布局「另存为模板」</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {userTemplates.map((template) => (
                    <UserTemplateCard
                      key={template.id}
                      template={template}
                      isSelected={selectedUserTemplateId === template.id}
                      onSelect={() => {
                        setSelectedUserTemplateId(template.id)
                        setSelectedPresetId(null)
                      }}
                      onDelete={(e) => {
                        e.stopPropagation()
                        handleDeleteUserTemplate(template.id)
                      }}
                      isDeleting={deletingId === template.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 预设模板 */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-content-secondary">预设模板</h4>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {layoutTemplates.map((template) => (
                  <TemplatePreviewCard
                    key={template.id}
                    template={template}
                    isSelected={selectedPresetId === template.id}
                    onSelect={() => {
                      setSelectedPresetId(template.id)
                      setSelectedUserTemplateId(null)
                    }}
                  />
                ))}
              </div>
            </div>

            {(selectedPreset || selectedUserTemplateId) && (
              <motion.div
                className="rounded-lg border border-line-secondary bg-surface-secondary p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h4 className="mb-2 font-medium text-content-primary">
                  {selectedPreset
                    ? `${selectedPreset.name} 包含的卡片：`
                    : userTemplates.find((t) => t.id === selectedUserTemplateId)?.name ?? '已选模板'}
                </h4>
                {selectedPreset && (
                  <div className="flex flex-wrap gap-2">
                    {selectedPreset.cards.map((card, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-surface-primary px-3 py-1 text-xs text-content-secondary"
                      >
                        {getCardTypeName(card.type)}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleApply}
                disabled={!hasSelection || !!applyingId}
              >
                {applyingId ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    应用中…
                  </>
                ) : (
                  '应用模板'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SaveAsTemplateDialog
          open={showSaveAsDialog}
          onOpenChange={setShowSaveAsDialog}
          layout={layout}
          nav={navConfig}
          canvas={{ scale }}
          onSaved={fetchUserTemplates}
        />
      </>
    )
  }
)

function getCardTypeName(type: string): string {
  const names: Record<string, string> = {
    profile: '个人资料',
    stats: '统计数据',
    categories: '分类/标签',
    recent_posts: '最近文章',
    tabbar: '标签栏',
    latest_posts: '最新文章',
    random_posts: '随机文章',
    calendar: '日历',
    clock: '时钟',
  }
  return names[type] || type
}
