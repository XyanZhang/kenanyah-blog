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
    var customTheme = null;

    function applyCustomThemeVars(theme) {
      if (!theme) return;
      root.style.setProperty('--theme-bg-base', theme.backgroundBase);
      root.style.setProperty('--theme-bg-orb-1', 'color-mix(in srgb, ' + theme.primary + ' 42%, white 58%)');
      root.style.setProperty('--theme-bg-orb-2', 'color-mix(in srgb, ' + theme.secondary + ' 40%, white 60%)');
      root.style.setProperty('--theme-bg-orb-3', 'color-mix(in srgb, ' + theme.tertiary + ' 34%, white 66%)');
      root.style.setProperty('--theme-bg-orb-4', 'color-mix(in srgb, ' + theme.primary + ' 28%, ' + theme.backgroundBase + ' 72%)');
      root.style.setProperty('--theme-bg-orb-5', 'color-mix(in srgb, ' + theme.secondary + ' 22%, white 78%)');
      root.style.setProperty('--theme-bg-orb-6', 'color-mix(in srgb, ' + theme.tertiary + ' 20%, ' + theme.backgroundBase + ' 80%)');
      root.style.setProperty('--theme-bg-orb-7', 'color-mix(in srgb, ' + theme.primary + ' 18%, ' + theme.backgroundBase + ' 82%)');
      root.style.setProperty('--theme-bg-orb-8', 'color-mix(in srgb, ' + theme.secondary + ' 16%, ' + theme.backgroundBase + ' 84%)');
      root.style.setProperty('--theme-accent-primary', theme.primary);
      root.style.setProperty('--theme-accent-secondary', theme.secondary);
      root.style.setProperty('--theme-accent-tertiary', theme.tertiary);
      root.style.setProperty('--theme-accent-primary-light', 'color-mix(in srgb, ' + theme.primary + ' 12%, white 88%)');
      root.style.setProperty('--theme-accent-secondary-light', 'color-mix(in srgb, ' + theme.secondary + ' 12%, white 88%)');
      root.style.setProperty('--theme-accent-tertiary-light', 'color-mix(in srgb, ' + theme.tertiary + ' 12%, white 88%)');
      root.style.setProperty('--theme-accent-primary-dark', 'color-mix(in srgb, ' + theme.primary + ' 82%, black 18%)');
      root.style.setProperty('--theme-accent-primary-muted', 'color-mix(in srgb, ' + theme.primary + ' 68%, white 32%)');
      root.style.setProperty('--theme-accent-primary-subtle', 'color-mix(in srgb, ' + theme.primary + ' 7%, white 93%)');
      root.style.setProperty('--theme-surface-primary', 'rgba(255, 255, 255, 0.92)');
      root.style.setProperty('--theme-surface-secondary', 'color-mix(in srgb, ' + theme.backgroundBase + ' 58%, white 42%)');
      root.style.setProperty('--theme-surface-tertiary', 'color-mix(in srgb, ' + theme.primary + ' 6%, white 94%)');
      root.style.setProperty('--theme-surface-hover', 'color-mix(in srgb, ' + theme.primary + ' 10%, white 90%)');
      root.style.setProperty('--theme-surface-glass', 'rgba(255, 255, 255, 0.18)');
      root.style.setProperty('--theme-surface-selected', 'color-mix(in srgb, ' + theme.primary + ' 12%, white 88%)');
      root.style.setProperty('--theme-text-primary', '#111827');
      root.style.setProperty('--theme-text-secondary', '#334155');
      root.style.setProperty('--theme-text-tertiary', '#475569');
      root.style.setProperty('--theme-text-muted', '#64748b');
      root.style.setProperty('--theme-text-dim', '#94a3b8');
      root.style.setProperty('--theme-text-disabled', '#cbd5e1');
      root.style.setProperty('--theme-text-inverse', '#ffffff');
      root.style.setProperty('--theme-border-primary', 'color-mix(in srgb, ' + theme.primary + ' 10%, #cbd5e1 90%)');
      root.style.setProperty('--theme-border-secondary', 'color-mix(in srgb, ' + theme.secondary + ' 12%, #cbd5e1 88%)');
      root.style.setProperty('--theme-border-hover', 'color-mix(in srgb, ' + theme.primary + ' 34%, white 66%)');
      root.style.setProperty('--theme-border-focus', theme.secondary);
      root.style.setProperty('--theme-border-glass', 'rgba(255, 255, 255, 0.56)');
      root.style.setProperty('--theme-ui-primary', theme.primary);
      root.style.setProperty('--theme-ui-primary-hover', 'color-mix(in srgb, ' + theme.primary + ' 86%, black 14%)');
      root.style.setProperty('--theme-ui-primary-ring', 'color-mix(in srgb, ' + theme.primary + ' 54%, white 46%)');
      root.style.setProperty('--theme-ui-destructive', '#dc2626');
      root.style.setProperty('--theme-ui-destructive-hover', '#b91c1c');
      root.style.setProperty('--theme-ui-destructive-light', '#fef2f2');
      root.style.setProperty('--theme-ui-success', 'color-mix(in srgb, ' + theme.tertiary + ' 14%, white 86%)');
      root.style.setProperty('--theme-ui-success-text', 'color-mix(in srgb, ' + theme.tertiary + ' 70%, #065f46 30%)');
      root.style.setProperty('--theme-ui-switch-off', '#e2e8f0');
      root.style.setProperty('--theme-shadow-color', 'rgba(15, 23, 42, 0.08)');
      root.style.setProperty('--theme-shadow-accent', 'color-mix(in srgb, ' + theme.primary + ' 18%, transparent)');
      root.style.setProperty('--frosted-blur', '56px');
      root.style.setProperty('--frosted-saturate', '1.2');
      root.style.setProperty('--frosted-tint', 'rgba(255, 255, 255, 0.06)');
    }

    if (stored) {
      var parsed = JSON.parse(stored);
      if (parsed && parsed.state) {
        if (parsed.state.themeId) {
          themeId = parsed.state.themeId;
        }
        if (parsed.state.colorModePreference) {
          colorModePreference = parsed.state.colorModePreference;
        }
        if (parsed.state.customTheme) {
          customTheme = parsed.state.customTheme;
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

    if (themeId === 'custom' && customTheme) {
      applyCustomThemeVars(customTheme);
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
