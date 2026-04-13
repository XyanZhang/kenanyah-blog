'use client'

/**
 * 全局路由切换时的顶部加载条。
 * 用于 Next.js App Router 的 loading.tsx。
 */
export function PageLoading() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-1 overflow-hidden"
      aria-label="页面加载中"
      role="status"
    >
      <div
        className="page-loading-bar absolute inset-y-0 left-0 w-[28%] rounded-r-full bg-accent-primary opacity-95"
        aria-hidden
        style={{
          boxShadow: '0 0 18px var(--theme-accent-primary)',
        }}
      />
      <span className="sr-only">页面加载中</span>
    </div>
  )
}
