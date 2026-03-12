import { PageBackground } from '@/components/background/PageBackground'

/**
 * 认证页面布局：简洁背景，无导航栏干扰
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <PageBackground />
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        {children}
      </div>
    </div>
  )
}