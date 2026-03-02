'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { DashboardCard, ClockCardConfig } from '@blog/types'

interface ClockCardProps {
  card: DashboardCard
}

function formatTime(date: Date, config: ClockCardConfig): string {
  const hours = config.format24h
    ? String(date.getHours()).padStart(2, '0')
    : String(date.getHours() % 12 || 12).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return config.showSeconds
    ? `${hours}:${minutes}:${seconds}`
    : `${hours}:${minutes}`
}

function getPeriod(date: Date): string {
  return date.getHours() >= 12 ? 'PM' : 'AM'
}

const FONT_CLASS_MAP: Record<ClockCardConfig['fontStyle'], string> = {
  mono: 'font-mono',
  sans: 'font-sans',
  serif: 'font-serif',
}

export function ClockCard({ card }: ClockCardProps) {
  const config = card.config as ClockCardConfig
  const [now, setNow] = useState(() => new Date())

  const tick = useCallback(() => {
    setNow(new Date())
  }, [])

  useEffect(() => {
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [tick])

  const timeStr = formatTime(now, config)
  const fontClass = FONT_CLASS_MAP[config.fontStyle] ?? 'font-mono'

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <div className="flex items-baseline gap-2">
        <span
          className={`
            ${fontClass}
            bg-linear-to-r from-accent-primary via-accent-secondary to-accent-tertiary
            bg-clip-text text-5xl font-bold tracking-wider text-transparent
            tabular-nums
          `}
        >
          {timeStr}
        </span>
        {!config.format24h && (
          <span className="text-lg font-medium text-content-dim">
            {getPeriod(now)}
          </span>
        )}
      </div>

      {config.showDate && (
        <span className="text-sm text-content-muted">
          {format(now, 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
        </span>
      )}
    </div>
  )
}
