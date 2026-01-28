'use client'

import { useState, useRef, useEffect } from 'react'
import { Palette, Check } from 'lucide-react'
import { useThemeStore, THEME_OPTIONS, type ThemeId } from '@/store/theme-store'

export function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { themeId, setTheme } = useThemeStore()

  // Close panel when clicking outside
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

  // Close panel on escape key
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

  const handleThemeSelect = (newThemeId: ThemeId) => {
    setTheme(newThemeId)
    setIsOpen(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Theme Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute bottom-16 right-0 w-72 rounded-2xl border border-line-primary bg-surface-primary p-4 shadow-xl"
        >
          <h3 className="mb-3 text-sm font-semibold text-content-primary">选择主题</h3>
          <div className="space-y-2">
            {THEME_OPTIONS.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeSelect(theme.id)}
                className={`
                  flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors
                  ${themeId === theme.id ? 'bg-surface-tertiary' : 'hover:bg-surface-hover'}
                `}
              >
                {/* Color Preview Dots */}
                <div className="flex -space-x-1">
                  {theme.previewColors.map((color, index) => (
                    <div
                      key={index}
                      className="h-5 w-5 rounded-full border-2 border-surface-primary"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                {/* Theme Info */}
                <div className="flex-1">
                  <div className="text-sm font-medium text-content-primary">
                    {theme.name}
                  </div>
                  <div className="text-xs text-content-muted">
                    {theme.description}
                  </div>
                </div>

                {/* Selected Indicator */}
                {themeId === theme.id && (
                  <Check className="h-4 w-4 text-accent-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toggle Button */}
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
        aria-label="切换主题"
      >
        <Palette className="h-5 w-5" />
      </button>
    </div>
  )
}
