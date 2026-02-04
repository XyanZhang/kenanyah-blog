'use client'

import { useState, useImperativeHandle, forwardRef } from 'react'
import { motion } from 'framer-motion'
import {
  Layout,
  Minus,
  LayoutGrid,
  Camera,
  BarChart3,
  UserCircle,
  Check,
} from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { Button } from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui'
import { layoutTemplates, LayoutTemplate } from '@/lib/dashboard/layout-templates'

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

export const LayoutTemplatePickerDialog = forwardRef<LayoutTemplatePickerHandle>(
  function LayoutTemplatePickerDialog(_props, ref) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<LayoutTemplate | null>(null)
    const { applyLayoutTemplate } = useDashboard()

    useImperativeHandle(ref, () => ({
      open: () => setIsOpen(true),
    }))

    const handleApply = () => {
      if (selectedTemplate) {
        applyLayoutTemplate(selectedTemplate)
        setIsOpen(false)
        setSelectedTemplate(null)
      }
    }

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>选择布局模板</DialogTitle>
            <DialogDescription>
              选择一个预设布局模板快速应用到首页，无需手动拖拽调整
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4 md:grid-cols-3">
            {layoutTemplates.map((template) => (
              <TemplatePreviewCard
                key={template.id}
                template={template}
                isSelected={selectedTemplate?.id === template.id}
                onSelect={() => setSelectedTemplate(template)}
              />
            ))}
          </div>

          {selectedTemplate && (
            <motion.div
              className="rounded-lg border border-line-secondary bg-surface-secondary p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h4 className="mb-2 font-medium text-content-primary">
                {selectedTemplate.name} 包含的卡片：
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.cards.map((card, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-surface-primary px-3 py-1 text-xs text-content-secondary"
                  >
                    {getCardTypeName(card.type)}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              取消
            </Button>
            <Button onClick={handleApply} disabled={!selectedTemplate}>
              应用模板
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
