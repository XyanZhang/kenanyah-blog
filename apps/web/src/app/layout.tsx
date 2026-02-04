import type { Metadata } from 'next'
import { Nav } from '@/components/navigation'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { FloatingActionsProvider } from '@/components/providers/FloatingActionsProvider'
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher'
import { RootAlignmentGuides } from '@/components/layout/RootAlignmentGuides'
import '@/styles/globals.css'

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
    <html lang="en" data-theme="default" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <FloatingActionsProvider>
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
