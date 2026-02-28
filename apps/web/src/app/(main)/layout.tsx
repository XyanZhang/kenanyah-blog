import { PageBackground } from '@/components/background/PageBackground'
import { FallingParticles } from '@/components/background/FallingParticles'

/** 花瓣类型使用的图片（项目内资源，位于 public/images/particle/） */
const PETAL_IMAGE = '/images/particle/petal_2.png'

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
      {/* 飘落粒子放在背景之上、内容之下，避免被大背景遮盖；花瓣类型使用引入的粉色花瓣图 */}
      <div className="pointer-events-none fixed inset-0 z-5">
        <FallingParticles
          type="petals"
          images={{ petals: PETAL_IMAGE }}
          count={16}
          opacity={0.82}
        />
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
