'use client'

import Link from 'next/link'
import { DashboardCard, CategoriesCardConfig } from '@blog/types'

interface CategoriesCardProps {
  card: DashboardCard
}

export function CategoriesCard({ card }: CategoriesCardProps) {
  const config = card.config as CategoriesCardConfig

  // Mock data - replace with actual API data
  const categories = [
    { id: '1', name: 'Technology', slug: 'technology', count: 15 },
    { id: '2', name: 'Design', slug: 'design', count: 8 },
    { id: '3', name: 'Development', slug: 'development', count: 12 },
    { id: '4', name: 'Tutorial', slug: 'tutorial', count: 6 },
    { id: '5', name: 'News', slug: 'news', count: 4 },
  ]

  const tags = [
    { id: '1', name: 'React', slug: 'react', count: 10 },
    { id: '2', name: 'TypeScript', slug: 'typescript', count: 8 },
    { id: '3', name: 'Next.js', slug: 'nextjs', count: 7 },
    { id: '4', name: 'CSS', slug: 'css', count: 5 },
    { id: '5', name: 'JavaScript', slug: 'javascript', count: 12 },
    { id: '6', name: 'Node.js', slug: 'nodejs', count: 4 },
    { id: '7', name: 'API', slug: 'api', count: 3 },
  ]

  const items = config.type === 'categories' ? categories : tags
  const displayItems = items.slice(0, config.limit)
  const maxCount = Math.max(...items.map((item) => item.count))

  const getTagSize = (count: number) => {
    const ratio = count / maxCount
    if (ratio > 0.8) return 'text-lg font-semibold'
    if (ratio > 0.5) return 'text-base font-medium'
    return 'text-sm'
  }

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        {config.type === 'categories' ? 'Categories' : 'Tags'}
      </h3>

      {config.type === 'categories' ? (
        <div className="flex-1 space-y-2 overflow-auto">
          {displayItems.map((item) => (
            <Link
              key={item.id}
              href={`/category/${item.slug}` as any}
              className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-gray-100"
            >
              <span className="text-gray-700">{item.name}</span>
              {config.showCount && (
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
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
                inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 transition-colors hover:bg-gray-200
                ${getTagSize(item.count)}
              `}
            >
              <span className="text-gray-700">{item.name}</span>
              {config.showCount && (
                <span className="text-xs text-gray-500">({item.count})</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
