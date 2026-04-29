'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardCard, CategoriesCardConfig } from '@blog/types'
import { getApiErrorMessage } from '@/lib/api-error'
import { getDashboardTaxonomyItems, type DashboardTaxonomyItem } from '@/lib/dashboard-content-api'
import { CardLoadingState } from './CardLoadingState'

interface CategoriesCardProps {
  card: DashboardCard
}

export function CategoriesCard({ card }: CategoriesCardProps) {
  const config = card.config as CategoriesCardConfig
  const [items, setItems] = useState<DashboardTaxonomyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getDashboardTaxonomyItems(config.type)
      .then((nextItems) => {
        if (!cancelled) setItems(nextItems)
      })
      .catch((err) => {
        if (cancelled) return
        setError(getApiErrorMessage(err))
        setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [config.type])

  const displayItems = items.slice(0, config.limit)
  const maxCount = Math.max(1, ...items.map((item) => item.count))

  const getTagSize = (count: number) => {
    const ratio = count / maxCount
    if (ratio > 0.8) return 'text-lg font-semibold'
    if (ratio > 0.5) return 'text-base font-medium'
    return 'text-sm'
  }

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-4 text-lg font-semibold text-content-primary">
        {config.type === 'categories' ? 'Categories' : 'Tags'}
      </h3>

      {loading ? (
        <div className="flex-1">
          <CardLoadingState />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : displayItems.length === 0 ? (
        <p className="text-sm text-content-tertiary">
          暂无{config.type === 'categories' ? '分类' : '标签'}
        </p>
      ) : config.type === 'categories' ? (
        <div className="flex-1 space-y-2 overflow-auto">
          {displayItems.map((item) => (
            <Link
              key={item.id}
              href={`/category/${item.slug}` as any}
              className="flex items-center justify-between rounded-xl bg-surface-glass/40 px-3 py-2 backdrop-blur-sm transition-colors hover:bg-surface-glass/60"
            >
              <span className="text-content-secondary">{item.name}</span>
              {config.showCount && (
                <span className="rounded-full bg-surface-glass/60 px-2 py-0.5 text-xs text-content-tertiary">
                  {item.count}
                </span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 flex-wrap content-start gap-2 overflow-auto">
          {displayItems.map((item) => (
            <Link
              key={item.id}
              href={`/tag/${item.slug}` as any}
              className={`
                inline-flex items-center gap-1 rounded-full bg-surface-glass/50 px-3 py-1 backdrop-blur-sm transition-colors hover:bg-surface-glass/70 border border-line-glass/30
                ${getTagSize(item.count)}
              `}
            >
              <span className="text-content-secondary">{item.name}</span>
              {config.showCount && (
                <span className="text-xs text-content-muted">({item.count})</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
