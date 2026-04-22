'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  isPast,
  isToday,
  startOfDay,
  setYear,
  addYears,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { format } from 'date-fns'
import { CalendarHeart, PlusCircle } from 'lucide-react'
import { DashboardCard, CountdownCardConfig } from '@blog/types'
import { getCountdownEvents, type CountdownEventDto } from '@/lib/countdown-api'
import { CardLoadingState } from './CardLoadingState'

interface CountdownCardProps {
  card: DashboardCard
  onOpenConfig?: () => void
}

const TYPE_LABELS: Record<CountdownEventDto['type'], string> = {
  birthday: '生日',
  anniversary: '纪念日',
  exam: '考试',
  activity: '活动',
}

/** 生日/纪念日取「下一次发生日」；其他类型用目标日当天 0 点 */
function getTargetDisplayDate(targetDate: Date, type: CountdownEventDto['type']): Date {
  const d = startOfDay(targetDate)
  if (type !== 'birthday' && type !== 'anniversary') return d
  const now = new Date()
  const today = startOfDay(now)
  let next = setYear(d, now.getFullYear())
  if (next < today) next = addYears(next, 1)
  return next
}

function formatCountdown(targetDate: Date): string {
  if (isPast(targetDate)) return '已过'
  if (isToday(targetDate)) return '今天'
  const now = new Date()
  const days = differenceInDays(targetDate, now)
  const hours = differenceInHours(targetDate, now) % 24
  if (days > 0) return `还剩 ${days} 天 ${hours} 时`
  if (hours > 0) {
    const mins = differenceInMinutes(targetDate, now) % 60
    return `还剩 ${hours} 时 ${mins} 分`
  }
  const mins = differenceInMinutes(targetDate, now)
  return mins > 0 ? `还剩 ${mins} 分钟` : '即将到来'
}

export function CountdownCard({ card, onOpenConfig }: CountdownCardProps) {
  const config = (card.config || {}) as CountdownCardConfig
  const limit = config.limit ?? 3
  const futureOnly = config.futureOnly !== false

  const [events, setEvents] = useState<CountdownEventDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = () => {
    setLoading(true)
    setError(null)
    getCountdownEvents(50)
      .then((list) => setEvents(list))
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    const handler = () => fetchEvents()
    window.addEventListener('countdown-events-changed', handler)
    return () => window.removeEventListener('countdown-events-changed', handler)
  }, [])

  const displayList = useMemo(() => {
    const today = startOfDay(new Date())
    let list = events.map((e) => {
      const raw = new Date(e.targetDate)
      const displayDate = getTargetDisplayDate(raw, e.type)
      return { ...e, displayDate, rawDate: raw }
    })
    if (futureOnly) {
      list = list.filter((e) => e.displayDate >= today)
    }
    list = [...list].sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime())
    return list.slice(0, limit)
  }, [events, futureOnly, limit])

  if (loading) {
    return (
      <CardLoadingState spinnerSize="sm" />
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col justify-center p-4 text-center">
        <p className="text-sm text-content-muted">{error}</p>
        <p className="mt-2 text-xs text-content-tertiary">登录后可管理倒计时</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-content-primary">
          <CalendarHeart className="h-5 w-5 text-accent-primary" />
          倒计时
        </h3>
        {onOpenConfig && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onOpenConfig()
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-content-muted transition-colors hover:bg-surface-glass/60 hover:text-accent-primary"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            管理
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-auto">
        {displayList.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <CalendarHeart className="h-10 w-10 text-content-tertiary/50" />
            <p className="text-sm text-content-muted">暂无活动</p>
            {onOpenConfig && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onOpenConfig()
                }}
                className="text-xs text-accent-primary hover:underline"
              >
                添加第一个倒计时
              </button>
            )}
          </div>
        ) : (
          displayList.map((event) => {
            const displayDate = event.displayDate
            const isPastEvent = isPast(displayDate) && !isToday(displayDate)
            const dateLabel = format(
              event.type === 'birthday' || event.type === 'anniversary' ? event.rawDate : displayDate,
              'M月d日',
              { locale: zhCN }
            )
            return (
              <div
                key={event.id}
                className="rounded-xl border border-line-glass/50 bg-surface-glass/40 p-3 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-content-primary truncate">
                      {event.title}
                    </p>
                    <p className="mt-0.5 text-xs text-content-muted">
                      {TYPE_LABELS[event.type]} · {dateLabel}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium ${
                      isPastEvent ? 'text-content-tertiary' : 'text-accent-primary'
                    }`}
                  >
                    {formatCountdown(displayDate)}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
