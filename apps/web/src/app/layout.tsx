import type { Metadata } from 'next'
import { Nav } from '@/components/navigation'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { FloatingActionsProvider } from '@/components/providers/FloatingActionsProvider'
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher'
import { RootAlignmentGuides } from '@/components/layout/RootAlignmentGuides'
import { ToastProvider } from '@/components/providers/ToastProvider'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { MusicPlayerProvider } from '@/components/music/MusicPlayerProvider'
import { MusicPlayerGlobal } from '@/components/music/MusicPlayerGlobal'
import { lxgwWenKaiTc, nunito, plusJakartaSans, spaceGrotesk } from '@/lib/fonts'
import '@/styles/globals.css'

const themeScript = `
  try {
    var root = document.documentElement;
    var stored = localStorage.getItem('blog-theme');
    var themeId = 'default';
    var colorModePreference = 'system';

    if (stored) {
      var parsed = JSON.parse(stored);
      if (parsed && parsed.state) {
        if (parsed.state.themeId) {
          themeId = parsed.state.themeId;
        }
        if (parsed.state.colorModePreference) {
          colorModePreference = parsed.state.colorModePreference;
        }
      }
    }

    var resolvedColorMode =
      colorModePreference === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : colorModePreference;

    root.setAttribute('data-theme', themeId);
    root.setAttribute('data-color-mode-preference', colorModePreference);
    root.setAttribute('data-color-mode', resolvedColorMode);
    root.style.colorScheme = resolvedColorMode;
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
    <html
      lang="en"
      data-theme="default"
      data-color-mode="light"
      data-color-mode-preference="system"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${spaceGrotesk.variable} ${nunito.variable} ${lxgwWenKaiTc.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <FloatingActionsProvider>
            <div className="frosted-overlay" />
            <Nav />
            <GlobalSearch />
            <ScrollToTop />
            <div>{children}</div>
            <MusicPlayerProvider />
            <MusicPlayerGlobal />
            <ToastProvider />
            <ThemeSwitcher />
            <RootAlignmentGuides />
          </FloatingActionsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
