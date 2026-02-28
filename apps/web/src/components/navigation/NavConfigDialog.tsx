'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui'
import { Button, Label, Switch } from '@/components/ui'
import { useNavStore, type NavLayout } from '@/store/nav-store'
import { navItems } from './nav-items'
import {
  Home,
  FileText,
  User,
  Camera,
  Images,
  FolderOpen,
  LayoutGrid,
  MessageCircle,
  Search,
  type LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  Home,
  FileText,
  User,
  Camera,
  Images,
  FolderOpen,
  LayoutGrid,
  MessageCircle,
  Search,
}

interface NavConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NavConfigDialog({ open, onOpenChange }: NavConfigDialogProps) {
  const { config, setLayout, toggleItemVisibility, resetConfig, updateSize } = useNavStore()

  const layoutOptions: { value: NavLayout; label: string; description: string }[] = [
    { value: 'auto', label: '自动', description: '首页水平显示，其他页面垂直显示' },
    { value: 'horizontal', label: '水平', description: '始终水平排列' },
    { value: 'vertical', label: '垂直', description: '始终垂直排列' },
  ]

  const handleReset = () => {
    resetConfig()
    onOpenChange(false)
  }

  const handleClearSize = () => {
    updateSize(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>导航配置</DialogTitle>
          <DialogDescription>自定义导航栏的布局和显示项目</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto py-4">
          {/* Layout mode */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">布局模式</Label>
            <div className="grid gap-2">
              {layoutOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setLayout(option.value)}
                  className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
                    config.layout === option.value
                      ? 'border-accent-primary bg-accent-primary-subtle'
                      : 'border-line-primary hover:border-line-hover'
                  }`}
                >
                  <span className="font-medium text-content-primary">{option.label}</span>
                  <span className="text-xs text-content-muted">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Visible items */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">显示项目</Label>
            <div className="space-y-2">
              {navItems.map((item) => {
                const IconComponent = iconMap[item.icon]
                const isVisible = config.visibleItems.includes(item.id)
                const isLastVisible = isVisible && config.visibleItems.length === 1

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-line-primary p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-primary-light to-accent-secondary-light">
                        <IconComponent className="h-4 w-4 text-accent-primary" />
                      </div>
                      <span className="font-medium text-content-primary">{item.label}</span>
                    </div>
                    <Switch
                      checked={isVisible}
                      onCheckedChange={() => toggleItemVisibility(item.id)}
                      disabled={isLastVisible}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Custom size info */}
          {config.customSize && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">自定义尺寸</Label>
              <div className="flex items-center justify-between rounded-lg border border-line-primary p-3">
                <span className="text-sm text-content-secondary">
                  {config.customSize.width} x {config.customSize.height} px
                </span>
                <Button size="sm" variant="outline" onClick={handleClearSize}>
                  清除
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            重置全部
          </Button>
          <Button onClick={() => onOpenChange(false)}>完成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
