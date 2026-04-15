'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { Palette, Check, Bot, Monitor, Moon, Sun } from 'lucide-react'
import { useFloatingActions } from '@/components/providers/FloatingActionsProvider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui'
import { useTheme } from '@/hooks/useTheme'

const colorModeIcons = {
  system: Monitor,
  dark: Moon,
  light: Sun,
} as const

export function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const {
    themeId,
    themes,
    setTheme,
    colorModePreference,
    colorModes,
    resolvedColorMode,
    setColorModePreference,
  } = useTheme()
  const { extraActions } = useFloatingActions()
  const pathname = usePathname()
  const isAiChatPage = pathname === '/ai-chat'
  const ActiveColorModeIcon = colorModeIcons[colorModePreference]

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
    setIsOpen(false)
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
          className="absolute bottom-16 right-0 w-80 rounded-2xl border border-line-primary bg-surface-primary p-4 shadow-xl"
        >
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-content-primary">显示模式</h3>
              <span className="text-xs text-content-muted">
                {colorModePreference === 'system'
                  ? `跟随系统 · 当前${resolvedColorMode === 'dark' ? '深色' : '浅色'}`
                  : colorModePreference === 'dark'
                    ? '固定深色'
                    : '固定浅色'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {colorModes.map((mode) => {
                const Icon = colorModeIcons[mode.id]
                const isSelected = colorModePreference === mode.id

                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setColorModePreference(mode.id)}
                    className={`
                      flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition-colors
                      ${isSelected
                        ? 'border-line-focus bg-surface-selected text-content-primary'
                        : 'border-line-primary bg-surface-secondary text-content-secondary hover:bg-surface-hover'
                      }
                    `}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4" />
                      {mode.name}
                    </span>
                    <span className="text-xs text-content-muted">{mode.description}</span>
                  </button>
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
