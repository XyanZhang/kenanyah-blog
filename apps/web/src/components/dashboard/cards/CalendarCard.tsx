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
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900">
            {format(currentDate, 'yyyy年MM月', { locale: zhCN })}
          </h3>
          <button
            onClick={goToToday}
            className="rounded-md px-2 py-0.5 text-xs text-purple-600 transition-colors hover:bg-purple-50"
          >
            今天
          </button>
        </div>

        <button
          onClick={goToNextMonth}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-1 text-center text-xs font-medium text-gray-500"
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
                ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                ${isCurrentDay && config.highlightToday ? 'bg-purple-500 font-semibold text-white shadow-md shadow-purple-200' : ''}
                ${!isCurrentDay && isCurrentMonth ? 'hover:bg-gray-100' : ''}
              `}
            >
              <span className="flex h-full w-full items-center justify-center">
                {format(day, 'd')}
              </span>

              {config.showPostDots && dayHasPost && isCurrentMonth && (
                <span
                  className={`
                    absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full
                    ${isCurrentDay ? 'bg-white' : 'bg-purple-400'}
                  `}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-purple-500" />
          <span>今天</span>
        </div>
        {config.showPostDots && (
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
            <span>有文章</span>
          </div>
        )}
      </div>
    </div>
  )
}
