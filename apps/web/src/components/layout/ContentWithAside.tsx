import React from 'react'
import { cn } from '@/lib/utils'

export interface ContentWithAsideProps {
  children: React.ReactNode
  aside?: React.ReactNode
  /**
   * 内容容器最大宽度（仅作用于主内容列）。
   * 默认与文章详情页一致：max-w-3xl。
   */
  contentClassName?: string
  /**
   * 外层容器（控制全宽、padding、栅格）className。
   */
  className?: string
  /**
   * 侧栏是否只在 xl 及以上显示（默认 true）。
   */
  asideDesktopOnly?: boolean
  /**
   * 右侧栏列宽（Tailwind arbitrary value）。
   * 默认 220px，让内容区保持更强居中感与空气感。
   */
  asideWidth?: number
  /**
   * 主内容区固定宽度（px）。
   * 文章详情页可传 768（对应 max-w-3xl），保证目录紧贴正文右侧。
   */
  contentWidth?: number
}

export function ContentWithAside({
  children,
  aside,
  className,
  contentClassName,
  asideDesktopOnly = true,
  asideWidth = 220,
  contentWidth = 768,
}: ContentWithAsideProps) {
  const showAside = Boolean(aside)

  return (
    <div
      className={cn(
        'w-full',
        showAside ? 'max-w-[1200px]' : '',
        'mx-auto px-4 sm:px-6',
        className
      )}
    >
      <div
        className={cn(
          'grid gap-8',
          showAside ? `xl:grid-cols-[${asideWidth}px_minmax(0,${contentWidth}px)_${asideWidth}px]` : ''
        )}
      >
        {showAside ? <div className={cn('hidden xl:block')} aria-hidden /> : null}
        <div className={cn('min-w-0 w-full', contentClassName)}>
          {children}
        </div>
        {showAside ? (
          <aside className={cn('min-w-0', asideDesktopOnly ? 'hidden xl:block' : '')}>
            <div className="sticky top-28">
              {aside}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}

