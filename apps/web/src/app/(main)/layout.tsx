import { PageBackground } from '@/components/background/PageBackground'

/**
 * 非首页的公共 layout：为固定在上方的 Nav 预留顶部间距，背景与首页一致（主题底色 + bokeh 光球）。
 * 首页 (/) 不经过此 layout。
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen pt-25">
      <PageBackground />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
