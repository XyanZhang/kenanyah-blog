'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, Upload, Wand2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthSession } from '@/hooks/useAuthSession'
import {
  assistThoughtAi,
  createThought,
  fetchThoughtById,
  updateThought,
  uploadThoughtImage,
} from '@/lib/thoughts-api'

type Props =
  | { mode: 'create' }
  | { mode: 'edit'; thoughtId: string }

export function ThoughtComposeForm(props: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user, authChecked } = useAuthSession()
  const [keywords, setKeywords] = useState('')
  const [content, setContent] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(props.mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const editId = props.mode === 'edit' ? props.thoughtId : null

  useEffect(() => {
    if (!editId) return
    let cancelled = false
    ;(async () => {
      try {
        const t = await fetchThoughtById(editId)
        if (cancelled) return
        setContent(t.content)
        const imgs = Array.isArray(t.images)
          ? (t.images as string[]).filter(Boolean)
          : []
        setImageUrls(imgs)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : '加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [editId])

  const runAssist = async (mode: 'generate' | 'polish') => {
    setError(null)
    setAiBusy(true)
    try {
      const text = await assistThoughtAi({
        mode,
        keywords: keywords.trim(),
        draft: mode === 'polish' ? content : undefined,
      })
      setContent(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 请求失败')
    } finally {
      setAiBusy(false)
    }
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setError(null)
    setUploadBusy(true)
    try {
      const next: string[] = []
      for (let i = 0; i < files.length; i += 1) {
        const f = files[i]
        if (!f.type.startsWith('image/')) continue
        const url = await uploadThoughtImage(f)
        next.push(url)
      }
      if (next.length) {
        setImageUrls((prev) => [...prev, ...next])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败')
    } finally {
      setUploadBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeImageAt = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  if (!authChecked) {
    return (
      <p className="text-sm text-content-tertiary">正在检查登录状态…</p>
    )
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-line-secondary bg-card p-6 text-center space-y-3">
        <p className="text-content-secondary text-sm">
          发布或编辑思考需要先登录。
        </p>
        <Link
          href="/login"
          className={cn(
            'inline-flex items-center justify-center rounded-md font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'bg-ui-primary text-content-inverse hover:bg-ui-primary-hover h-10 px-4 py-2'
          )}
        >
          去登录
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-content-tertiary text-sm py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载中…
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = content.trim()
    if (!trimmed) {
      setError('请填写正文')
      return
    }
    setSaving(true)
    try {
      const images = imageUrls
      if (props.mode === 'create') {
        await createThought({
          content: trimmed,
          ...(images.length ? { images } : {}),
        })
      } else {
        await updateThought(props.thoughtId, {
          content: trimmed,
          images,
        })
      }
      router.push('/thoughts')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
      {error && (
        <p className="text-sm text-ui-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="space-y-3 rounded-lg border border-line-secondary bg-surface-primary/50 p-4 sm:p-5">
        <div>
          <label
            htmlFor="thought-keywords"
            className="block text-sm font-medium text-content-secondary mb-2"
          >
            关键词 / 灵感要点
          </label>
          <input
            id="thought-keywords"
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="w-full rounded-lg border border-line-secondary bg-surface-primary px-3 py-2 text-content-primary text-sm placeholder:text-content-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary"
            placeholder="例如：读完《xxx》的一句摘录、今天的一个念头…"
          />
        </div>
        <p className="text-xs text-content-tertiary leading-relaxed">
          使用阿里云百炼「千问」文本模型（与封面图相同
          DASHSCOPE_API_KEY）。生成略放开联想（temperature 约 0.82），美化更稳（约
          0.55）。
        </p>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5 sm:w-auto"
            disabled={aiBusy || !keywords.trim()}
            onClick={() => runAssist('generate')}
          >
            {aiBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            根据关键词生成
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5 sm:w-auto"
            disabled={aiBusy || !content.trim()}
            onClick={() => runAssist('polish')}
          >
            {aiBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            美化正文
          </Button>
        </div>
      </div>

      <div>
        <label
          htmlFor="thought-content"
          className="block text-sm font-medium text-content-secondary mb-2"
        >
          正文
        </label>
        <textarea
          id="thought-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          className="min-h-[240px] w-full resize-y rounded-lg border border-line-secondary bg-surface-primary px-3 py-3 text-[15px] leading-relaxed text-content-primary placeholder:text-content-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary sm:min-h-[260px]"
          placeholder="写点什么…"
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-content-secondary mb-2">
          配图（可选）
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1.5 sm:w-auto"
          disabled={uploadBusy}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          上传图片
        </Button>
        <p className="text-xs text-content-tertiary mt-2">
          单张不超过 8MB；文件保存在服务器的{' '}
          <code className="text-[11px]">uploads/thoughts/</code>，与其他上传目录区分。
        </p>
        {imageUrls.length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {imageUrls.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="relative aspect-4/3 rounded-lg overflow-hidden bg-muted group"
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="200px"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => removeImageAt(i)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/55 text-white opacity-90 hover:opacity-100"
                  aria-label="移除图片"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
        <Button
          type="submit"
          disabled={saving || aiBusy}
          className="w-full gap-2 sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              保存中…
            </>
          ) : props.mode === 'create' ? (
            '发布'
          ) : (
            '保存'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => router.push('/thoughts')}
        >
          取消
        </Button>
      </div>
    </form>
  )
}
