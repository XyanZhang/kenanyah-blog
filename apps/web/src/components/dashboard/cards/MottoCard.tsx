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
  line: 'h-px bg-linear-to-r from-transparent via-accent-primary/50 to-transparent',
  dots: 'flex justify-center gap-1',
  bracket: '',
}

export function MottoCard({ card }: MottoCardProps) {
  const config = card.config as MottoCardConfig
  const textSizeClass = TEXT_SIZE_MAP[config.textSize] ?? 'text-xl'
  const fontStyleClass = FONT_STYLE_MAP[config.fontStyle] ?? 'font-serif'
  const alignClass = ALIGN_MAP[config.textAlign] ?? 'text-center'

  return (
    <div className={`flex h-full flex-col items-center justify-center ${alignClass} p-6 md:p-8 relative overflow-hidden`}>
      {/* 背景装饰渐变 */}
      <div className="absolute inset-0 bg-linear-to-br from-accent-primary/5 via-transparent to-accent-secondary/5 opacity-60" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent-secondary/10 rounded-full blur-2xl" />
      
      <div className={`relative z-10 w-full max-w-2xl ${textSizeClass} text-content-primary`}>
        {/* 引号装饰 - 更大更优雅 */}
        <div className="relative mb-6">
          <Quote className="absolute -top-4 -left-4 h-10 w-10 md:h-12 md:w-12 rotate-180 text-accent-primary/20" />
          <Quote className="absolute -bottom-2 -right-2 h-8 w-8 md:h-10 md:w-10 text-accent-secondary/20" />
        </div>
        
        {/* 主要内容 */}
        <div className="relative">
          <p 
            className={`
              relative z-10 
              font-light
              leading-[1.8]
              tracking-wide
              ${textSizeClass}
              ${fontStyleClass === 'sans' ? '' : fontStyleClass}
              text-content-primary
              drop-shadow-sm
            `}
            style={{
              fontFamily: fontStyleClass === 'sans' 
                ? 'var(--font-motto), "Nunito", ui-rounded, system-ui, sans-serif'
                : undefined,
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            }}
          >
            <span className="inline-block italic">
              {config.motto || '生活不止眼前的苟且，还有诗和远方'}
            </span>
          </p>
          
          {/* 分隔线 */}
          {config.showDivider && (
            <div className="mt-6 mb-4">
              {config.dividerStyle === 'dots' ? (
                <div className="flex justify-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent-primary/50 animate-pulse" style={{ animationDelay: '0s' }} />
                  <span className="h-2.5 w-2.5 rounded-full bg-accent-primary/70 animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="h-2 w-2 rounded-full bg-accent-primary/50 animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              ) : config.dividerStyle === 'bracket' ? (
                <div className="flex items-center justify-center gap-3 text-accent-primary/40">
                  <span className="text-2xl font-light">——</span>
                </div>
              ) : (
                <div className={`${DIVIDER_MAP[config.dividerStyle]} w-full`} />
              )}
            </div>
          )}
          
          {/* 作者信息 */}
          {config.author && (
            <p 
              className={`
                mt-4 
                text-sm md:text-base
                font-medium
                text-content-secondary
                tracking-wide
                opacity-80
              `}
              style={{
                fontFamily: 'var(--font-motto), "Nunito", ui-rounded, system-ui, sans-serif',
              }}
            >
              —— {config.author}
            </p>
          )}
        </div>
      </div>
      
      {/* 底部装饰线条 */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-accent-primary/20 to-transparent" />
    </div>
  )
}
