'use client'

/**
 * 全局路由切换时的顶部加载条。
 * 用于 Next.js App Router 的 loading.tsx。
 */
export function PageLoading() {
  return (
    <>
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
      <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-28 sm:px-6 md:pt-16" aria-busy="true">
        <div className="rounded-2xl border border-line-glass bg-surface-glass/45 p-5 shadow-sm backdrop-blur-sm sm:p-6">
          <div className="h-5 w-28 animate-pulse rounded-full bg-surface-tertiary/60" />
          <div className="mt-5 h-8 w-3/4 animate-pulse rounded-full bg-surface-tertiary/55" />
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-surface-tertiary/45" />
          <div className="mt-8 space-y-3">
            <div className="h-4 w-full animate-pulse rounded-full bg-surface-tertiary/45" />
            <div className="h-4 w-11/12 animate-pulse rounded-full bg-surface-tertiary/45" />
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-surface-tertiary/45" />
          </div>
        </div>
      </main>
    </>
  )
}
