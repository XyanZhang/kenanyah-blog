'use client'

import { useState, useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { DashboardCard, CalendarCardConfig } from '@blog/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarCardProps {
  card: DashboardCard
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function CalendarCard({ card }: CalendarCardProps) {
  const config = card.config as CalendarCardConfig
  const [currentDate, setCurrentDate] = useState(new Date())

  const postDates = useMemo(
    () => [
      new Date(2026, 0, 25),
      new Date(2026, 0, 22),
      new Date(2026, 0, 18),
      new Date(2026, 0, 15),
      new Date(2026, 0, 10),
      new Date(2026, 0, 5),
    ],
    []
  )

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const hasPost = (date: Date) => {
    return postDates.some((postDate) => isSameDay(postDate, date))
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
            onClick={goToToday}
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
          <div
            key={day}
            className="py-1 text-center text-xs font-medium text-content-muted"
          >
            {day}
          </div>
        ))}

        {calendarDays.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isCurrentDay = isToday(day)
          const dayHasPost = hasPost(day)

          return (
            <button
              key={index}
              className={`
                relative aspect-square rounded-lg p-1 text-sm transition-all
                ${!isCurrentMonth ? 'text-content-disabled' : 'text-content-secondary'}
                ${isCurrentDay && config.highlightToday ? 'bg-accent-primary font-semibold text-white shadow-md' : ''}
                ${!isCurrentDay && isCurrentMonth ? 'hover:bg-surface-glass/50' : ''}
              `}
            >
              <span
                className={`flex h-full w-full items-center justify-center ${isCurrentDay && config.highlightToday ? 'text-white' : ''}`}
              >
                {format(day, 'd')}
              </span>

              {config.showPostDots && dayHasPost && isCurrentMonth && (
                <span
                  className={`
                    absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full
                    ${isCurrentDay ? 'bg-surface-primary' : 'bg-accent-primary-muted'}
                  `}
                />
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
        {config.showPostDots && (
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-primary-muted" />
            <span>有文章</span>
          </div>
        )}
      </div>
    </div>
  )
}
