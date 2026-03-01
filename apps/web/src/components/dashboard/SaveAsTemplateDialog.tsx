'use client'

import { useState, useEffect } from 'react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Label } from '@/components/ui'
import { createHomeTemplate } from '@/lib/home-api'
import type { DashboardLayout } from '@blog/types'
import type { NavConfig } from '@/store/nav-store'

interface SaveAsTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  layout: DashboardLayout | null
  nav: NavConfig | null
  canvas?: { scale?: number } | null
  onSaved?: () => void
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  layout,
  nav,
  canvas,
  onSaved,
}: SaveAsTemplateDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setError(null)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!layout || !nav || !name.trim()) return
    setLoading(true)
    setError(null)
    try {
      await createHomeTemplate({
        name: name.trim(),
        description: description.trim() || null,
        layout,
        nav,
        canvas: canvas ?? null,
      })
      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>另存为模板</DialogTitle>
          <DialogDescription>
            将当前首页的组件与位置保存为模板，之后可在「我的模板」中一键应用
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">模板名称</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：工作台"
              required
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-desc">描述（选填）</Label>
            <Input
              id="template-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简短描述该模板的用途"
              maxLength={200}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || !nav}>
              {loading ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
