'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
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
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [cardWidth, setCardWidth] = useState(300)
  const [cardHeight, setCardHeight] = useState(300)

  const showAnnotations = config.showAnnotations !== false
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate])
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate])
  const isCompact = cardWidth <= 280
  const isTight = cardWidth <= 236
  const monthLabel = isTight
    ? format(currentDate, 'yyyy/MM', { locale: zhCN })
    : format(currentDate, 'yyyy年MM月', { locale: zhCN })

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

  useEffect(() => {
    const node = rootRef.current
    if (!node) return

    const syncWidth = () => {
      setCardWidth(node.clientWidth)
      setCardHeight(node.clientHeight)
    }

    syncWidth()
    const observer = new ResizeObserver(syncWidth)
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

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

  const openMonth = (date: Date) => {
    router.push(`/calendar/month/${format(date, 'yyyy-MM')}`)
  }

  const weekdayRows = Math.ceil(calendarDays.length / 7)
  const headerHeight = Math.max(40, cardHeight * 0.16)
  const footerHeight = Math.max(showAnnotations ? 40 : 34, cardHeight * (isTight ? 0.14 : 0.16))
  const bodyHeight = Math.max(140, cardHeight - headerHeight - footerHeight)
  const weekdayHeaderHeight = Math.max(16, bodyHeight * 0.1)
  const dayGridHeight = Math.max(120, bodyHeight - weekdayHeaderHeight)
  const dayCellHeight = dayGridHeight / Math.max(1, weekdayRows)
  const cellPadding = Math.max(2, Math.min(cardWidth, dayCellHeight) * 0.06)
  const navIconSize = Math.max(14, Math.min(cardWidth, cardHeight) * 0.05)
  const navButtonPadding = Math.max(4, Math.min(cardWidth, cardHeight) * 0.02)
  const titleFontSize = Math.max(14, Math.min(cardWidth * 0.06, 20))
  const todayFontSize = Math.max(10, Math.min(cardWidth * 0.035, 12))
  const weekdayFontSize = Math.max(10, Math.min(cardWidth * 0.032, 12))
  const dayNumberFontSize = Math.max(11, Math.min(dayCellHeight * 0.32, 16))
  const countBadgeFontSize = Math.max(9, Math.min(dayCellHeight * 0.16, 11))
  const eventDotSize = Math.max(5, Math.min(dayCellHeight * 0.12, 7))
  const legendFontSize = Math.max(10, Math.min(cardWidth * 0.032, 12))
  const legendDotSize = Math.max(6, Math.min(cardHeight * 0.025, 8))
  const topBadgeInset = Math.max(2, dayCellHeight * 0.08)
  const bottomDotInset = Math.max(2, dayCellHeight * 0.06)
  const headerGap = Math.max(4, cardWidth * 0.015)

  return (
    <div ref={rootRef} className="flex h-full min-h-0 flex-col">
      <div
        className="flex items-center justify-between"
        style={{
          minHeight: headerHeight,
          marginBottom: Math.max(6, cardHeight * 0.02),
        }}
      >
        <button
          onClick={goToPreviousMonth}
          className="rounded-lg text-content-muted backdrop-blur-sm transition-colors hover:bg-surface-glass/60 hover:text-content-secondary"
          style={{ padding: navButtonPadding }}
        >
          <ChevronLeft style={{ width: navIconSize, height: navIconSize }} />
        </button>

        <div className="flex items-center" style={{ gap: headerGap }}>
          <button
            type="button"
            onClick={() => openMonth(currentDate)}
            className="font-semibold text-content-primary transition-colors hover:text-accent-primary"
            style={{ fontSize: titleFontSize }}
          >
            {monthLabel}
          </button>
          <button
            onClick={() => openDay(new Date())}
            className="rounded-md text-accent-primary transition-colors hover:bg-accent-primary-subtle"
            style={{
              paddingInline: Math.max(6, cardWidth * 0.02),
              paddingBlock: Math.max(2, cardHeight * 0.006),
              fontSize: todayFontSize,
            }}
          >
            {isTight ? '今' : '今天'}
          </button>
        </div>

        <button
          onClick={goToNextMonth}
          className="rounded-lg text-content-muted backdrop-blur-sm transition-colors hover:bg-surface-glass/60 hover:text-content-secondary"
          style={{ padding: navButtonPadding }}
        >
          <ChevronRight style={{ width: navIconSize, height: navIconSize }} />
        </button>
      </div>

      <div className="grid grid-cols-7" style={{ gap: Math.max(2, cardWidth * 0.008) }}>
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center font-medium text-content-muted"
            style={{
              minHeight: weekdayHeaderHeight,
              lineHeight: `${weekdayHeaderHeight}px`,
              fontSize: weekdayFontSize,
            }}
          >
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
                relative aspect-square transition-all
                ${isTight ? 'rounded-md' : isCompact ? 'rounded-md' : 'rounded-lg'}
                ${!isCurrentMonth ? 'text-content-disabled' : 'text-content-secondary'}
                ${isCurrentDay && config.highlightToday ? 'bg-accent-primary font-semibold text-white shadow-md' : ''}
                ${!isCurrentDay && isCurrentMonth ? 'hover:bg-surface-glass/50' : ''}
              `}
              style={{
                minHeight: dayCellHeight,
                padding: cellPadding,
                fontSize: dayNumberFontSize,
              }}
              title={
                summary
                  ? `${dateStr} · ${summary.totalCount} 条事件${summary.annotationLabel ? ` · ${summary.annotationLabel}` : ''}`
                  : dateStr
              }
            >
              {hasEvents && isCurrentMonth && (
                isTight ? (
                  <span
                    className="absolute flex items-center justify-center rounded-full bg-surface-primary/90 font-medium text-content-primary shadow-sm"
                    style={{
                      right: topBadgeInset,
                      top: topBadgeInset,
                      minWidth: Math.max(14, dayCellHeight * 0.24),
                      height: Math.max(14, dayCellHeight * 0.24),
                      paddingInline: Math.max(4, dayCellHeight * 0.06),
                      fontSize: countBadgeFontSize,
                    }}
                  >
                    {summary?.totalCount}
                  </span>
                ) : (
                  <span
                    className="absolute rounded-full bg-surface-primary/80 font-medium text-content-primary shadow-sm"
                    style={{
                      right: topBadgeInset,
                      top: topBadgeInset,
                      paddingInline: Math.max(5, dayCellHeight * 0.08),
                      paddingBlock: Math.max(2, dayCellHeight * 0.03),
                      fontSize: countBadgeFontSize,
                    }}
                  >
                    {summary?.totalCount}
                  </span>
                )
              )}

              <span
                className={`flex h-full w-full items-center justify-center ${isCurrentDay && config.highlightToday ? 'text-white' : ''}`}
              >
                {format(day, 'd')}
              </span>

              {hasEvents && isCurrentMonth && (
                <span
                  className={`
                    absolute left-1/2 -translate-x-1/2 rounded-full
                    ${hasPlanned ? 'bg-accent-secondary' : hasCompleted ? 'bg-accent-primary-muted' : 'bg-content-muted'}
                  `}
                  style={{
                    bottom: bottomDotInset,
                    width: eventDotSize,
                    height: eventDotSize,
                  }}
                />
              )}

              {showAnnotations && hasAnnotation && isCurrentMonth && (
                <span
                  className="absolute rounded-full border border-white bg-accent-primary"
                  style={{
                    bottom: bottomDotInset,
                    left: '58%',
                    width: eventDotSize,
                    height: eventDotSize,
                  }}
                />
              )}
            </button>
          )
        })}
      </div>

      <div
        className="mt-auto flex flex-wrap items-center justify-center border-t border-line-glass/50 text-content-muted"
        style={{
          minHeight: footerHeight,
          paddingTop: Math.max(6, cardHeight * 0.02),
          columnGap: Math.max(8, cardWidth * 0.03),
          rowGap: Math.max(4, cardHeight * 0.01),
          fontSize: legendFontSize,
          marginTop: Math.max(6, cardHeight * 0.02),
        }}
      >
        <div className="flex items-center gap-1">
          <span
            className="rounded-full bg-accent-primary"
            style={{ width: legendDotSize, height: legendDotSize }}
          />
          <span>{isTight ? '今' : '今天'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="rounded-full bg-accent-primary-muted"
            style={{ width: Math.max(5, legendDotSize - 1), height: Math.max(5, legendDotSize - 1) }}
          />
          <span>{isTight ? '完成' : '已完成'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="rounded-full bg-accent-secondary"
            style={{ width: Math.max(5, legendDotSize - 1), height: Math.max(5, legendDotSize - 1) }}
          />
          <span>{isTight ? '计划' : '计划中'}</span>
        </div>
        {showAnnotations && (
          <div className="flex items-center gap-1">
            <span
              className="rounded-full border border-white bg-accent-primary"
              style={{ width: Math.max(5, legendDotSize - 1), height: Math.max(5, legendDotSize - 1) }}
            />
            <span>{isTight ? '注' : '附注'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
