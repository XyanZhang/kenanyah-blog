export type ThemeId =
  | 'default'
  | 'summer-breeze'
  | 'warm-natural'
  | 'classic-minimal'
  | 'vintage-study'
  | 'morandi'
  | 'sakura-pink'
  | 'custom'

export type ColorModePreference = 'system' | 'dark' | 'light'

export interface CustomThemeColors {
  name: string
  backgroundBase: string
  primary: string
  secondary: string
  tertiary: string
}

export interface ThemeConfig {
  themeId: ThemeId
  colorModePreference: ColorModePreference
  customTheme?: CustomThemeColors | null
}
