'use client'

import { cn } from '@/lib/utils'

interface CardLoadingStateProps {
  label?: string
  className?: string
  spinnerSize?: 'sm' | 'md' | 'lg'
}

const spinnerSizeMap = {
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
} as const

export function CardLoadingState({
  label = '加载中 / Loading',
  className,
  spinnerSize = 'md',
}: CardLoadingStateProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-4 rounded-[inherit]',
        className
      )}
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--theme-surface-primary) 84%, transparent), color-mix(in srgb, var(--theme-accent-primary-subtle) 78%, var(--theme-surface-secondary) 22%))',
      }}
    >
      <div className="relative flex items-center justify-center">
        <div
          className={cn('animate-spin rounded-full border-[3px]', spinnerSizeMap[spinnerSize])}
          style={{
            borderColor: 'color-mix(in srgb, var(--theme-border-primary) 72%, transparent)',
            borderTopColor: 'var(--theme-accent-primary)',
            borderRightColor: 'color-mix(in srgb, var(--theme-accent-secondary) 58%, transparent)',
            boxShadow: '0 10px 28px -16px var(--theme-shadow-accent)',
          }}
        />
        <div
          className="absolute h-2.5 w-2.5 rounded-full"
          style={{
            background:
              'linear-gradient(135deg, var(--theme-accent-primary), var(--theme-accent-secondary))',
            boxShadow: '0 0 0 6px color-mix(in srgb, var(--theme-accent-primary-light) 46%, transparent)',
          }}
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-content-secondary">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-8 rounded-full bg-[color-mix(in_srgb,var(--theme-accent-primary)_32%,transparent)]" />
          <span className="h-1.5 w-12 rounded-full bg-[color-mix(in_srgb,var(--theme-accent-secondary)_26%,transparent)]" />
          <span className="h-1.5 w-6 rounded-full bg-[color-mix(in_srgb,var(--theme-accent-tertiary)_26%,transparent)]" />
        </div>
      </div>
    </div>
  )
}
