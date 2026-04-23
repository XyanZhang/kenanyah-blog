'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { Palette, Check, Bot, Monitor, Moon, Sun, Loader2, Save, Sparkles } from 'lucide-react'
import { useFloatingActions } from '@/components/providers/FloatingActionsProvider'
import { Button, Input, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'
import { useTheme } from '@/hooks/useTheme'
import { useAuthSession } from '@/hooks/useAuthSession'
import { putHomeConfig, getHomeConfig } from '@/lib/home-api'
import { showApiError, showApiSuccess } from '@/lib/api-error'
import { aiRecommendTheme } from '@/lib/ai-api'
import { useDashboardStore } from '@/store/dashboard-store'
import { useNavStore } from '@/store/nav-store'
import { useHomeCanvasStore } from '@/store/home-canvas-store'

const colorModeIcons = {
  system: Monitor,
  dark: Moon,
  light: Sun,
} as const

const colorModeButtonStyles = {
  system: {
    active: 'text-content-primary',
    icon: 'text-accent-primary',
    glow:
      'bg-[radial-gradient(circle,color-mix(in_srgb,var(--theme-accent-primary)_20%,transparent),transparent_72%)]',
  },
  dark: {
    active: 'text-content-primary',
    icon: 'text-accent-secondary',
    glow:
      'bg-[radial-gradient(circle,color-mix(in_srgb,var(--theme-accent-secondary)_22%,transparent),transparent_72%)]',
  },
  light: {
    active: 'text-content-primary',
    icon: 'text-accent-tertiary',
    glow:
      'bg-[radial-gradient(circle,color-mix(in_srgb,var(--theme-accent-tertiary)_22%,transparent),transparent_72%)]',
  },
} as const

export function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false)
  const [aiThemePrompt, setAiThemePrompt] = useState('')
  const [aiThemeRationale, setAiThemeRationale] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const {
    themeId,
    currentTheme,
    themes,
    setTheme,
    colorModePreference,
    colorModes,
    resolvedColorMode,
    setColorModePreference,
    customTheme,
    updateCustomTheme,
    getThemeConfig,
  } = useTheme()
  const { extraActions } = useFloatingActions()
  const { isAuthenticated, authChecked } = useAuthSession()
  const pathname = usePathname()
  const isAiChatPage = pathname === '/ai-chat'
  const ActiveColorModeIcon = colorModeIcons[colorModePreference]
  const presetThemesForAi = themes.map((theme) => ({
    id: theme.id,
    name: theme.name,
    description: theme.description,
    previewColors: [...theme.previewColors] as [string, string, string],
  }))

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleThemeSelect = (newThemeId: typeof themeId) => {
    setTheme(newThemeId)
  }

  const handleSaveTheme = async () => {
    if (!isAuthenticated) return

    setIsSaving(true)
    try {
      const currentLayout = useDashboardStore.getState().layout
      const currentNav = useNavStore.getState().config
      const currentScale = useHomeCanvasStore.getState().scale
      const fallbackConfig = !currentLayout ? await getHomeConfig() : null

      const layoutToSave = currentLayout ?? fallbackConfig?.layout
      const navToSave = fallbackConfig?.nav ?? currentNav
      const canvasToSave = fallbackConfig?.canvas ?? { scale: currentScale }

      if (!layoutToSave || !navToSave) {
        throw new Error('当前没有可保存的首页配置')
      }

      await putHomeConfig({
        layout: layoutToSave,
        nav: navToSave,
        canvas: canvasToSave,
        theme: getThemeConfig(),
      })

      showApiSuccess('主题已保存', '下次从配置接口读取时会使用当前主题方案')
    } catch (error) {
      showApiError(error, '保存主题失败')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAiRecommendTheme = async () => {
    if (!aiThemePrompt.trim()) {
      showApiError(new Error('请先输入你想要的主题风格提示词'), 'AI 推荐失败')
      return
    }

    setIsGeneratingTheme(true)
    try {
      const recommendation = await aiRecommendTheme({
        prompt: aiThemePrompt.trim(),
        currentThemeId: currentTheme.id,
        currentThemeName: currentTheme.name,
        currentThemeDescription: currentTheme.description,
        siteStyleSummary:
          'This site uses soft glassmorphism, calm background gradients, modern editorial feeling, clean UI, light atmosphere, and readable accent colors. The result should feel refined, soft, and not overly neon.',
        currentCustomTheme: customTheme,
        presetThemes: presetThemesForAi,
      })

      updateCustomTheme({
        name: recommendation.name,
        backgroundBase: recommendation.backgroundBase,
        primary: recommendation.primary,
        secondary: recommendation.secondary,
        tertiary: recommendation.tertiary,
      })
      setTheme('custom')
      setAiThemeRationale(recommendation.rationale ?? '')
      showApiSuccess('AI 已生成主题预览', '你可以先看效果，再决定是否保存')
    } catch (error) {
      showApiError(error, 'AI 推荐失败')
    } finally {
      setIsGeneratingTheme(false)
    }
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex-col items-center gap-3 ${
        isAiChatPage ? 'hidden min-[760px]:flex' : 'flex'
      }`}
    >
      {/* Extra Buttons Slot */}
      {extraActions}

      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/ai-chat"
            className={`
              flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all
              ${isAiChatPage
                ? 'bg-accent-primary text-white'
                : 'bg-surface-primary text-content-secondary hover:bg-surface-hover border border-line-primary'
              }
            `}
            aria-label="打开 AI 对话"
          >
            <Bot className="h-5 w-5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="left">AI 对话</TooltipContent>
      </Tooltip>

      {/* Theme Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute bottom-16 right-0 max-h-[min(78vh,44rem)] w-[22rem] overflow-y-auto rounded-[1.75rem] border border-line-primary bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-surface-primary)_92%,white_8%),color-mix(in_srgb,var(--theme-surface-secondary)_94%,transparent))] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur-md"
        >
          <div className="pointer-events-none absolute inset-x-6 top-0 h-16 rounded-full bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--theme-accent-primary)_14%,transparent),transparent_72%)] blur-2xl" />
          <div className="mb-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-content-primary">显示模式</h3>
              <span className="rounded-full border border-line-primary bg-surface-secondary px-2.5 py-1 text-[11px] font-medium text-content-muted shadow-sm">
                {colorModePreference === 'system'
                  ? `跟随系统 · 当前${resolvedColorMode === 'dark' ? '深色' : '浅色'}`
                  : colorModePreference === 'dark'
                    ? '固定深色'
                    : '固定浅色'}
              </span>
            </div>
            <div className="flex items-center justify-center gap-3 rounded-[1.25rem] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-surface-secondary)_72%,white_28%),color-mix(in_srgb,var(--theme-surface-selected)_50%,transparent))] px-3 py-2">
              {colorModes.map((mode) => {
                const Icon = colorModeIcons[mode.id]
                const isSelected = colorModePreference === mode.id
                const modeStyle = colorModeButtonStyles[mode.id]

                return (
                  <Tooltip key={mode.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setColorModePreference(mode.id)}
                        aria-label={mode.name}
                        aria-pressed={isSelected}
                        className={`
                          relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full transition-all duration-300
                          ${isSelected
                            ? modeStyle.active
                            : 'text-content-secondary hover:text-content-primary'
                          }
                        `}
                      >
                        {isSelected && (
                          <>
                            <span className={`absolute inset-0 opacity-90 ${modeStyle.glow}`} />
                            <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current/70" />
                          </>
                        )}
                        <span className="relative flex h-8 w-8 items-center justify-center rounded-full">
                          <Icon
                            className={`transition-transform duration-300 ${isSelected ? `h-5 w-5 scale-110 ${modeStyle.icon}` : 'h-[18px] w-[18px]'}`}
                          />
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{mode.name}</TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>

          <div className="border-t border-line-primary pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-content-primary">配色主题</h3>
              <span className="text-xs text-content-muted">保留当前明暗模式</span>
            </div>
            <div className="space-y-2">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleThemeSelect(theme.id)}
                  className={`
                    flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors
                    ${themeId === theme.id ? 'bg-surface-tertiary' : 'hover:bg-surface-hover'}
                  `}
                >
                  <div className="flex -space-x-1">
                    {theme.previewColors.map((color, index) => (
                      <div
                        key={index}
                        className="h-5 w-5 rounded-full border-2 border-surface-primary"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  <div className="flex-1">
                    <div className="text-sm font-medium text-content-primary">
                      {theme.name}
                    </div>
                    <div className="text-xs text-content-muted">
                      {theme.description}
                    </div>
                  </div>

                  {themeId === theme.id && (
                    <Check className="h-4 w-4 text-accent-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-line-primary pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-content-primary">自定义主题</h3>
                <p className="mt-0.5 text-[11px] text-content-muted">颜色会立即预览</p>
              </div>
              <span className="rounded-full border border-line-primary bg-surface-secondary px-2.5 py-1 text-[11px] font-medium text-content-muted shadow-sm">
                {themeId === 'custom' ? '当前使用中' : '可编辑'}
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="rounded-xl border border-line-primary bg-surface-secondary/45 p-2">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-content-secondary">
                  <Sparkles className="h-3.5 w-3.5 text-accent-primary" />
                  AI 推荐
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={aiThemePrompt}
                    onChange={(event) => setAiThemePrompt(event.target.value)}
                    placeholder="如：日系奶油、安静书房、未来感海风"
                    className="h-8 min-w-0 px-2 text-[11px]"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 shrink-0 gap-1.5 px-2.5 text-[11px]"
                    onClick={handleAiRecommendTheme}
                    disabled={isGeneratingTheme}
                  >
                    {isGeneratingTheme ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    推荐
                  </Button>
                </div>
                {aiThemeRationale ? (
                  <p className="mt-1.5 text-[11px] text-content-muted">{aiThemeRationale}</p>
                ) : (
                  <p className="mt-1.5 text-[11px] text-content-muted">
                    会参考当前主题、现有预设和站点风格生成预览。
                  </p>
                )}
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-content-secondary">方案名称</span>
                <Input
                  value={customTheme.name}
                  maxLength={24}
                  onChange={(event) => updateCustomTheme({ name: event.target.value })}
                  placeholder="My Theme"
                  className="h-9 text-xs"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                {[
                { key: 'backgroundBase', label: '背景色' },
                { key: 'primary', label: '主色' },
                { key: 'secondary', label: '辅助色' },
                { key: 'tertiary', label: '点缀色' },
              ].map((field) => (
                <label
                  key={field.key}
                  className="rounded-xl border border-line-primary bg-surface-secondary/45 p-2"
                >
                  <span className="mb-1 block text-[11px] font-medium text-content-secondary">
                    {field.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={customTheme[field.key as keyof typeof customTheme] as string}
                      onChange={(event) =>
                        updateCustomTheme({
                          [field.key]: event.target.value,
                        })
                      }
                      className="h-8 w-9 cursor-pointer rounded-md border border-line-primary bg-transparent p-1"
                    />
                    <Input
                      value={customTheme[field.key as keyof typeof customTheme] as string}
                      onChange={(event) =>
                        updateCustomTheme({
                          [field.key]: event.target.value,
                        })
                      }
                      className="h-8 min-w-0 px-2 font-mono text-[11px]"
                    />
                  </div>
                </label>
              ))}
              </div>

              <Button
                type="button"
                variant={themeId === 'custom' ? 'default' : 'outline'}
                className="h-9 w-full text-xs"
                onClick={() => setTheme('custom')}
              >
                使用当前自定义主题
              </Button>
            </div>
          </div>

          <div className="mt-4 border-t border-line-primary pt-4">
            {authChecked && isAuthenticated ? (
              <Button
                type="button"
                className="w-full gap-2"
                onClick={handleSaveTheme}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存到配置接口
              </Button>
            ) : (
              <div className="rounded-xl border border-dashed border-line-primary bg-surface-secondary/50 px-3 py-2 text-xs text-content-muted">
                登录后可将当前主题保存到首页配置接口。
              </div>
            )}
          </div>
        </div>
      )}

      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all
          ${isOpen
            ? 'bg-accent-primary text-white'
            : 'bg-surface-primary text-content-secondary hover:bg-surface-hover border border-line-primary'
          }
        `}
        aria-label="切换主题与显示模式"
      >
        <span className="relative flex items-center justify-center">
          <Palette className="h-5 w-5" />
          <span className="absolute -right-3 -top-3 flex h-5 w-5 items-center justify-center rounded-full border border-line-primary bg-surface-primary text-content-secondary shadow-sm">
            <ActiveColorModeIcon className="h-3 w-3" />
          </span>
        </span>
      </button>
    </div>
  )
}
