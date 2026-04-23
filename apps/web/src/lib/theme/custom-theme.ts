import type { CustomThemeColors, ThemeConfig } from '@blog/types'

export const DEFAULT_CUSTOM_THEME: CustomThemeColors = {
  name: 'My Theme',
  backgroundBase: '#f6f4ff',
  primary: '#7c6b9e',
  secondary: '#5a7a9e',
  tertiary: '#5a8a8f',
}

function normalizeHex(value: string, fallback: string): string {
  const trimmed = value.trim()
  return /^#([0-9a-fA-F]{6})$/.test(trimmed) ? trimmed.toLowerCase() : fallback
}

export function normalizeCustomThemeColors(
  input?: Partial<CustomThemeColors> | null
): CustomThemeColors {
  return {
    name: input?.name?.trim() || DEFAULT_CUSTOM_THEME.name,
    backgroundBase: normalizeHex(input?.backgroundBase ?? '', DEFAULT_CUSTOM_THEME.backgroundBase),
    primary: normalizeHex(input?.primary ?? '', DEFAULT_CUSTOM_THEME.primary),
    secondary: normalizeHex(input?.secondary ?? '', DEFAULT_CUSTOM_THEME.secondary),
    tertiary: normalizeHex(input?.tertiary ?? '', DEFAULT_CUSTOM_THEME.tertiary),
  }
}

export function normalizeThemeConfig(input?: Partial<ThemeConfig> | null): ThemeConfig {
  const themeId = input?.themeId ?? 'default'
  const colorModePreference = input?.colorModePreference ?? 'system'

  return {
    themeId,
    colorModePreference,
    customTheme: normalizeCustomThemeColors(input?.customTheme),
  }
}

export function buildCustomThemeCssVariables(theme: CustomThemeColors): Record<string, string> {
  const colors = normalizeCustomThemeColors(theme)

  return {
    '--theme-bg-base': colors.backgroundBase,
    '--theme-bg-orb-1': `color-mix(in srgb, ${colors.primary} 42%, white 58%)`,
    '--theme-bg-orb-2': `color-mix(in srgb, ${colors.secondary} 40%, white 60%)`,
    '--theme-bg-orb-3': `color-mix(in srgb, ${colors.tertiary} 34%, white 66%)`,
    '--theme-bg-orb-4': `color-mix(in srgb, ${colors.primary} 28%, ${colors.backgroundBase} 72%)`,
    '--theme-bg-orb-5': `color-mix(in srgb, ${colors.secondary} 22%, white 78%)`,
    '--theme-bg-orb-6': `color-mix(in srgb, ${colors.tertiary} 20%, ${colors.backgroundBase} 80%)`,
    '--theme-bg-orb-7': `color-mix(in srgb, ${colors.primary} 18%, ${colors.backgroundBase} 82%)`,
    '--theme-bg-orb-8': `color-mix(in srgb, ${colors.secondary} 16%, ${colors.backgroundBase} 84%)`,
    '--theme-accent-primary': colors.primary,
    '--theme-accent-secondary': colors.secondary,
    '--theme-accent-tertiary': colors.tertiary,
    '--theme-accent-primary-light': `color-mix(in srgb, ${colors.primary} 12%, white 88%)`,
    '--theme-accent-secondary-light': `color-mix(in srgb, ${colors.secondary} 12%, white 88%)`,
    '--theme-accent-tertiary-light': `color-mix(in srgb, ${colors.tertiary} 12%, white 88%)`,
    '--theme-accent-primary-dark': `color-mix(in srgb, ${colors.primary} 82%, black 18%)`,
    '--theme-accent-primary-muted': `color-mix(in srgb, ${colors.primary} 68%, white 32%)`,
    '--theme-accent-primary-subtle': `color-mix(in srgb, ${colors.primary} 7%, white 93%)`,
    '--theme-surface-primary': 'rgba(255, 255, 255, 0.92)',
    '--theme-surface-secondary': `color-mix(in srgb, ${colors.backgroundBase} 58%, white 42%)`,
    '--theme-surface-tertiary': `color-mix(in srgb, ${colors.primary} 6%, white 94%)`,
    '--theme-surface-hover': `color-mix(in srgb, ${colors.primary} 10%, white 90%)`,
    '--theme-surface-glass': 'rgba(255, 255, 255, 0.18)',
    '--theme-surface-selected': `color-mix(in srgb, ${colors.primary} 12%, white 88%)`,
    '--theme-text-primary': '#111827',
    '--theme-text-secondary': '#334155',
    '--theme-text-tertiary': '#475569',
    '--theme-text-muted': '#64748b',
    '--theme-text-dim': '#94a3b8',
    '--theme-text-disabled': '#cbd5e1',
    '--theme-text-inverse': '#ffffff',
    '--theme-border-primary': `color-mix(in srgb, ${colors.primary} 10%, #cbd5e1 90%)`,
    '--theme-border-secondary': `color-mix(in srgb, ${colors.secondary} 12%, #cbd5e1 88%)`,
    '--theme-border-hover': `color-mix(in srgb, ${colors.primary} 34%, white 66%)`,
    '--theme-border-focus': colors.secondary,
    '--theme-border-glass': 'rgba(255, 255, 255, 0.56)',
    '--theme-ui-primary': colors.primary,
    '--theme-ui-primary-hover': `color-mix(in srgb, ${colors.primary} 86%, black 14%)`,
    '--theme-ui-primary-ring': `color-mix(in srgb, ${colors.primary} 54%, white 46%)`,
    '--theme-ui-destructive': '#dc2626',
    '--theme-ui-destructive-hover': '#b91c1c',
    '--theme-ui-destructive-light': '#fef2f2',
    '--theme-ui-success': `color-mix(in srgb, ${colors.tertiary} 14%, white 86%)`,
    '--theme-ui-success-text': `color-mix(in srgb, ${colors.tertiary} 70%, #065f46 30%)`,
    '--theme-ui-switch-off': '#e2e8f0',
    '--theme-shadow-color': 'rgba(15, 23, 42, 0.08)',
    '--theme-shadow-accent': `color-mix(in srgb, ${colors.primary} 18%, transparent)`,
    '--frosted-blur': '56px',
    '--frosted-saturate': '1.2',
    '--frosted-tint': 'rgba(255, 255, 255, 0.06)',
  }
}
