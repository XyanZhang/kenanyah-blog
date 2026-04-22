'use client'

import { cn } from '@/lib/utils'

interface CardLoadingStateProps {
  className?: string
  spinnerSize?: 'sm' | 'md' | 'lg'
}

const spinnerSizeMap = {
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
} as const

export function CardLoadingState({
  className,
  spinnerSize = 'md',
}: CardLoadingStateProps) {
  return (
    <div
      className={cn('flex h-full w-full items-center justify-center rounded-[inherit]', className)}
    >
      <div className="relative flex items-center justify-center">
        <div
          className={cn('animate-spin rounded-full border-[3px]', spinnerSizeMap[spinnerSize])}
          style={{
            borderColor: 'color-mix(in srgb, var(--theme-border-primary) 38%, transparent)',
            borderTopColor: 'var(--theme-accent-primary)',
            borderRightColor: 'color-mix(in srgb, var(--theme-accent-secondary) 72%, transparent)',
            boxShadow: '0 10px 28px -16px var(--theme-shadow-accent)',
          }}
        />
      </div>
    </div>
  )
}
