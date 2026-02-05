'use client'

import { Quote } from 'lucide-react'
import { DashboardCard, MottoCardConfig } from '@blog/types'

interface MottoCardProps {
  card: DashboardCard
}

const TEXT_SIZE_MAP: Record<MottoCardConfig['textSize'], string> = {
  small: 'text-lg',
  medium: 'text-xl',
  large: 'text-2xl',
}

const FONT_STYLE_MAP: Record<MottoCardConfig['fontStyle'], string> = {
  serif: 'font-serif',
  sans: 'font-sans',
  mono: 'font-mono',
}

const ALIGN_MAP: Record<MottoCardConfig['textAlign'], string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

const DIVIDER_MAP: Record<MottoCardConfig['dividerStyle'], string> = {
  line: 'h-px bg-gradient-to-r from-transparent via-accent-primary/50 to-transparent',
  dots: 'flex justify-center gap-1',
  bracket: '',
}

export function MottoCard({ card }: MottoCardProps) {
  const config = card.config as MottoCardConfig
  const textSizeClass = TEXT_SIZE_MAP[config.textSize] ?? 'text-xl'
  const fontStyleClass = FONT_STYLE_MAP[config.fontStyle] ?? 'font-serif'
  const alignClass = ALIGN_MAP[config.textAlign] ?? 'text-center'

  return (
    <div className={`flex h-full flex-col items-center justify-center ${alignClass} p-4`}>
      <div className={`relative ${textSizeClass} ${fontStyleClass} text-content-primary leading-relaxed`}>
        <Quote className="absolute -top-2 -left-2 h-6 w-6 rotate-180 text-accent-primary/30" />
        <p className="relative z-10 italic">
          {config.motto || '生活不止眼前的苟且，还有诗和远方'}
        </p>
        {config.showDivider && (
          <div className="mt-4">
            {config.dividerStyle === 'dots' ? (
              <div className="flex justify-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-primary/40" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent-primary/60" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent-primary/40" />
              </div>
            ) : config.dividerStyle === 'bracket' ? (
              <div className="flex items-center justify-center gap-2 text-accent-primary/30">
                <span className="text-xl">——</span>
              </div>
            ) : (
              <div className={DIVIDER_MAP[config.dividerStyle]} />
            )}
          </div>
        )}
        {config.author && (
          <p className="mt-3 text-sm font-medium text-content-secondary">
            —— {config.author}
          </p>
        )}
      </div>
    </div>
  )
}
