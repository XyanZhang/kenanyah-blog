'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function SearchResultsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-line-glass bg-surface-glass/45 p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-2/3 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-3 w-4/5 rounded-full" />
              <Skeleton className="h-3 w-20 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
