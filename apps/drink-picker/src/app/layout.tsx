import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '今天喝什么？ — AI帮你选饮品',
  description: '根据你的心情、MBTI和今日运势，为你推荐最适合的那杯饮品 ☕',
  openGraph: {
    title: '今天喝什么？',
    description: 'AI根据心情+MBTI+万年历帮你选饮品 ☕',
    type: 'website',
    locale: 'zh_CN',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6F4E37',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-brand-cream font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
