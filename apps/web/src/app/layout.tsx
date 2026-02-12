import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Space_Grotesk, Nunito } from 'next/font/google'
import { Nav } from '@/components/navigation'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { FloatingActionsProvider } from '@/components/providers/FloatingActionsProvider'
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher'
import { RootAlignmentGuides } from '@/components/layout/RootAlignmentGuides'
import { SmokeEffect } from '@/components/background/SmokeEffect'
import '@/styles/globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-motto',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

const themeScript = `
  try {
    var stored = localStorage.getItem('blog-theme');
    if (stored) {
      var parsed = JSON.parse(stored);
      if (parsed && parsed.state && parsed.state.themeId) {
        document.documentElement.setAttribute('data-theme', parsed.state.themeId);
      }
    }
  } catch(e) {}
`

export const metadata: Metadata = {
  title: {
    default: 'Blog',
    template: '%s | Blog',
  },
  description: 'A modern blog application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="default" suppressHydrationWarning className={`${plusJakartaSans.variable} ${spaceGrotesk.variable} ${nunito.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <FloatingActionsProvider>
            <SmokeEffect />
            <div className="frosted-overlay" />
            <Nav />
            <div style={{ viewTransitionName: 'page-content' }}>{children}</div>
            <ThemeSwitcher />
            <RootAlignmentGuides />
          </FloatingActionsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
