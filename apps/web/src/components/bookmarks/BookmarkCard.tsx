'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Bookmark, ExternalLink, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BookmarkItem {
  id: string
  title: string
  url: string
  notes: string | null
  category: string | null
  tags: string[] | null
  favicon: string | null
  createdAt: string
}

interface BookmarkCardProps {
  item: BookmarkItem
  className?: string
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function BookmarkCard({ item, className }: BookmarkCardProps) {
  const [faviconError, setFaviconError] = useState(false)
  const [copied, setCopied] = useState(false)
  const showFavicon = item.favicon && !faviconError
  const domain = getDomain(item.url)

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(item.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group flex items-center gap-3 rounded-xl border border-line-glass/40 bg-surface-glass/25 px-3 py-2 backdrop-blur-sm transition-all duration-200',
        'hover:bg-surface-glass/45',
        className
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-accent-primary-light ring-1 ring-line-glass/30">
        {showFavicon ? (
          <img
            src={item.favicon}
            alt=""
            className="h-5 w-5 object-contain"
            onError={() => setFaviconError(true)}
          />
        ) : (
          <Bookmark className="h-4 w-4 text-accent-primary" />
        )}
      </div>

      <div className="min-w-0 flex flex-1 items-center gap-2">
        <h4 className="min-w-0 shrink truncate text-sm font-medium text-content-primary group-hover:text-accent-primary transition-colors">
          {item.title}
        </h4>
        <span className="text-content-dim">·</span>
        <p className="max-w-44 truncate text-xs text-content-tertiary" title={item.url}>
          {domain}
        </p>
        {item.category && (
          <span className="shrink-0 rounded-md bg-accent-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-accent-primary">
            {item.category}
          </span>
        )}
        <span className="shrink-0 text-xs text-content-tertiary">
          {format(new Date(item.createdAt), 'MM/dd', { locale: zhCN })}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleCopyUrl}
          className="rounded-md p-1.5 text-content-tertiary hover:bg-surface-glass/60 hover:text-accent-primary transition-colors"
          title="复制链接"
          aria-label="复制链接"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
        <ExternalLink className="h-3.5 w-3.5 text-content-tertiary" />
      </div>
    </a>
  )
}
