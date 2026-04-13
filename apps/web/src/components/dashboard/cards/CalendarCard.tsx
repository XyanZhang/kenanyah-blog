'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { DashboardCard, CalendarCardConfig } from '@blog/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getCalendarEventSummary } from '@/lib/calendar-api'

interface CalendarCardProps {
  card: DashboardCard
}

type DaySummary = {
  totalCount: number
  plannedCount: number
  completedCount: number
  annotationLabel: string | null
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function CalendarCard({ card }: CalendarCardProps) {
  const router = useRouter()
  const config = card.config as CalendarCardConfig
  const [currentDate, setCurrentDate] = useState(new Date())
  const [summaryMap, setSummaryMap] = useState<Map<string, DaySummary>>(new Map())

  const showAnnotations = config.showAnnotations !== false
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate])
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate])

  useEffect(() => {
    const from = format(monthStart, 'yyyy-MM-dd')
    const to = format(monthEnd, 'yyyy-MM-dd')

    getCalendarEventSummary({ from, to })
      .then((list) => {
        const next = new Map<string, DaySummary>()
        list.forEach((item) => {
          next.set(item.date, {
            totalCount: item.totalCount,
            plannedCount: item.plannedCount,
            completedCount: item.completedCount,
            annotationLabel: item.annotationLabel,
          })
        })
        setSummaryMap(next)
      })
      .catch(() => setSummaryMap(new Map()))
  }, [monthStart, monthEnd])

  const calendarDays = useMemo(() => {
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [monthStart, monthEnd])

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const openDay = (date: Date) => {
    router.push(`/calendar/day/${format(date, 'yyyy-MM-dd')}`)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={goToPreviousMonth}
          className="rounded-lg p-1.5 text-content-muted backdrop-blur-sm transition-colors hover:bg-surface-glass/60 hover:text-content-secondary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-content-primary">
            {format(currentDate, 'yyyy年MM月', { locale: zhCN })}
          </h3>
          <button
            onClick={() => openDay(new Date())}
            className="rounded-md px-2 py-0.5 text-xs text-accent-primary transition-colors hover:bg-accent-primary-subtle"
          >
            今天
          </button>
        </div>

        <button
          onClick={goToNextMonth}
          className="rounded-lg p-1.5 text-content-muted backdrop-blur-sm transition-colors hover:bg-surface-glass/60 hover:text-content-secondary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1 text-center text-xs font-medium text-content-muted">
            {day}
          </div>
        ))}

        {calendarDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isCurrentDay = isToday(day)
          const summary = summaryMap.get(dateStr)
          const hasEvents = (summary?.totalCount ?? 0) > 0
          const hasPlanned = (summary?.plannedCount ?? 0) > 0
          const hasCompleted = (summary?.completedCount ?? 0) > 0
          const hasAnnotation = Boolean(summary?.annotationLabel)

          return (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openDay(day)
              }}
              className={`
                relative aspect-square rounded-lg p-1 text-sm transition-all
                ${!isCurrentMonth ? 'text-content-disabled' : 'text-content-secondary'}
                ${isCurrentDay && config.highlightToday ? 'bg-accent-primary font-semibold text-white shadow-md' : ''}
                ${!isCurrentDay && isCurrentMonth ? 'hover:bg-surface-glass/50' : ''}
              `}
              title={
                summary
                  ? `${dateStr} · ${summary.totalCount} 条事件${summary.annotationLabel ? ` · ${summary.annotationLabel}` : ''}`
                  : dateStr
              }
            >
              {hasEvents && isCurrentMonth && (
                <span className="absolute right-1 top-1 rounded-full bg-surface-primary/80 px-1.5 py-0.5 text-[10px] font-medium text-content-primary shadow-sm">
                  {summary?.totalCount}
                </span>
              )}

              <span
                className={`flex h-full w-full items-center justify-center ${isCurrentDay && config.highlightToday ? 'text-white' : ''}`}
              >
                {format(day, 'd')}
              </span>

              {hasEvents && isCurrentMonth && (
                <span
                  className={`
                    absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full
                    ${hasPlanned ? 'bg-accent-secondary' : hasCompleted ? 'bg-accent-primary-muted' : 'bg-content-muted'}
                  `}
                />
              )}

              {showAnnotations && hasAnnotation && isCurrentMonth && (
                <span className="absolute bottom-0.5 left-[58%] h-1.5 w-1.5 rounded-full border border-white bg-accent-primary" />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 border-t border-line-glass/50 pt-3 text-xs text-content-muted">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-accent-primary" />
          <span>今天</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-primary-muted" />
          <span>已完成</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-secondary" />
          <span>计划中</span>
        </div>
        {showAnnotations && (
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full border border-white bg-accent-primary" />
            <span>附注</span>
          </div>
        )}
      </div>
    </div>
  )
}
