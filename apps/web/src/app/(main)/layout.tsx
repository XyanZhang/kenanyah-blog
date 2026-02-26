/**
 * 非首页的公共 layout：为固定在上方的 Nav 预留顶部间距，避免内容被遮挡。
 * 首页 (/) 不经过此 layout。
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen pt-25">
      {children}
    </div>
  )
}
