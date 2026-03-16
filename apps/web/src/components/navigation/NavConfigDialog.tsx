'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui'
import { Button, Label, Switch, Input } from '@/components/ui'
import { useNavStore } from '@/store/nav-store'
import { getDefaultNavItemsConfig } from './nav-items'
import {
  Home,
  FileText,
  User,
  Camera,
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
  const { config, updateNavItem, toggleItemVisibility, resetConfig, updateSize } = useNavStore()
  const items = config.items?.length ? config.items : getDefaultNavItemsConfig()

  const handleReset = () => {
    resetConfig()
    onOpenChange(false)
  }

  const handleClearSize = () => {
    updateSize(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>导航配置</DialogTitle>
          <DialogDescription>配置导航显示项目与点击跳转地址，保存后同步到数据库</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto py-4">
          {/* 显示项目：每项单行展示 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">显示项目</Label>
            <div className="space-y-2">
              {items.map((item) => {
                const IconComponent = iconMap[item.icon]
                const isVisible = item.visible !== false
                const isLastVisible = isVisible && items.filter((i) => i.visible !== false).length === 1

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border border-line-primary px-3 py-2"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-accent-primary-light to-accent-secondary-light">
                      <IconComponent className="h-4 w-4 text-accent-primary" />
                    </div>
                    <Input
                      className="h-8 w-24 shrink-0 text-sm font-medium"
                      value={item.label}
                      onChange={(e) => updateNavItem(item.id, { label: e.target.value })}
                      placeholder="名称"
                    />
                    <Input
                      className="h-8 min-w-0 flex-1 text-sm text-content-secondary"
                      value={item.href}
                      onChange={(e) => updateNavItem(item.id, { href: e.target.value })}
                      placeholder="/path 或 https://..."
                    />
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
