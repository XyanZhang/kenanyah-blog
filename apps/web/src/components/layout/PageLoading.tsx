'use client'

/**
 * 全局页面切换时的加载动效：顶部进度条 + 居中 spinner，使用主题色。
 * 用于 Next.js App Router 的 loading.tsx。
 */
export function PageLoading() {
  return (
    <div
      className="relative flex min-h-[50vh] w-full items-center justify-center"
      aria-label="页面加载中"
      role="status"
    >
      {/* 顶部进度条 */}
      <div className="absolute left-0 right-0 top-0 h-1 overflow-hidden bg-transparent">
        <div
          className="page-loading-bar h-full w-1/3 rounded-full bg-accent-primary opacity-90"
          style={{
            boxShadow: '0 0 12px var(--theme-accent-primary)',
          }}
        />
      </div>

      {/* 居中 spinner */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12" aria-hidden>
          <span className="page-loading-spinner-ring" />
          <span className="page-loading-spinner-ring page-loading-spinner-ring--delay" />
        </div>
        <span className="text-sm text-content-tertiary motion-reduce:hidden">
          加载中…
        </span>
      </div>
    </div>
  )
}
