'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

interface AddBookmarkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddBookmarkDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddBookmarkDialogProps) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setTitle('')
    setUrl('')
    setNotes('')
    setCategory('')
    setError(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmedTitle = title.trim()
    const trimmedUrl = url.trim()
    if (!trimmedTitle || !trimmedUrl) {
      setError('请填写标题和地址')
      return
    }
    try {
      new URL(trimmedUrl)
    } catch {
      setError('请填写有效的 URL')
      return
    }

    setSubmitting(true)
    try {
      const res = await apiClient
        .post('bookmarks', {
          json: {
            title: trimmedTitle,
            url: trimmedUrl,
            notes: notes.trim() || undefined,
            category: category.trim() || undefined,
            source: 'manual',
          },
        })
        .json<{ success: boolean; error?: string }>()

      if (res.success) {
        resetForm()
        handleOpenChange(false)
        onSuccess()
      } else {
        setError(res.error ?? '添加失败')
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl border border-line-glass/50 bg-surface-primary/95 p-0 backdrop-blur-md">
        <DialogHeader>
          <div className="border-b border-line-glass/40 px-6 py-5">
            <DialogTitle className="text-xl text-content-primary">添加收藏</DialogTitle>
            <DialogDescription className="mt-1">
              保存网页标题、链接和备注，便于后续插件同步与分类。
            </DialogDescription>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <label htmlFor="add-bookmark-title" className="mb-1.5 block text-sm font-medium text-content-secondary">
              标题 *
            </label>
            <Input
              id="add-bookmark-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="文章标题"
              required
              maxLength={500}
              className="h-11 rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="add-bookmark-url" className="mb-1.5 block text-sm font-medium text-content-secondary">
              地址 *
            </label>
            <Input
              id="add-bookmark-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              required
              className="h-11 rounded-lg"
            />
            <p className="text-xs text-content-tertiary">建议填写完整链接，方便后续插件去重与同步。</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-1">
              <label htmlFor="add-bookmark-category" className="mb-1.5 block text-sm font-medium text-content-secondary">
                分类
              </label>
              <Input
                id="add-bookmark-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="如：技术、生活"
                maxLength={100}
                className="h-11 rounded-lg"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <label className="mb-1.5 block text-sm font-medium text-content-secondary">
                来源
              </label>
              <div className="flex h-11 items-center rounded-lg border border-line-secondary bg-surface-secondary px-3 text-sm text-content-tertiary">
                手动添加
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="add-bookmark-notes" className="mb-1.5 block text-sm font-medium text-content-secondary">
              备注
            </label>
            <textarea
              id="add-bookmark-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="可选，支持多行"
              maxLength={2000}
              rows={3}
              className="flex w-full rounded-lg border border-line-secondary bg-surface-primary px-3 py-2 text-sm placeholder:text-content-dim focus:outline-none focus:ring-2 focus:ring-line-focus focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[90px]"
            />
            <p className="text-xs text-content-tertiary">{notes.length}/2000</p>
          </div>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <DialogFooter className="border-t border-line-glass/40 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
              className="rounded-lg"
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting} className="rounded-lg">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  添加中
                </>
              ) : (
                '添加'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
