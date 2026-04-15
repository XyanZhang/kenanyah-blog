'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarDaySummaryDto, CalendarEventDto, CalendarEventStatus } from '@blog/types'
import {
  ArrowUpRight,
  BadgeCheck,
  Ban,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock3,
  Loader2,
  Pin,
  Sparkles,
  X,
} from 'lucide-react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { getCalendarEventSummary, getCalendarEvents } from '@/lib/calendar-api'
import { cn } from '@/lib/utils'

type SummaryMap = Map<string, CalendarDaySummaryDto>
type EventsMap = Map<string, CalendarEventDto[]>
type FloatingCardPosition = { top: number; left: number }

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function parseMonth(month: string) {
  return parse(`${month}-01`, 'yyyy-MM-dd', new Date())
}

function formatEventTime(event: CalendarEventDto) {
  if (event.allDay || /^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    return '全天'
  }

  const parsed = new Date(event.date)
  if (Number.isNaN(parsed.getTime())) return event.date
  return format(parsed, 'HH:mm')
}

function getSortableTimestamp(value: string) {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

function getStatusLabel(status: CalendarEventStatus) {
  switch (status) {
    case 'planned':
      return '计划中'
    case 'completed':
      return '已完成'
    case 'canceled':
      return '已取消'
    default:
      return status
  }
}

function getStatusIcon(status: CalendarEventStatus) {
  switch (status) {
    case 'completed':
      return <BadgeCheck className="h-4 w-4 text-ui-success" />
    case 'canceled':
      return <Ban className="h-4 w-4 text-content-muted" />
    default:
      return <CircleDashed className="h-4 w-4 text-accent-secondary" />
  }
}

function getStatusDotClassName(status: CalendarEventStatus) {
  switch (status) {
    case 'completed':
      return 'bg-ui-success'
    case 'canceled':
      return 'bg-content-disabled'
    default:
      return 'bg-accent-secondary'
  }
}

function getSourceLabel(event: CalendarEventDto) {
  switch (event.sourceType) {
    case 'manual':
      return '手记'
    case 'post':
      return '博客'
    case 'thought':
      return '想法'
    case 'project':
      return '项目'
    case 'photo':
      return '照片'
    case 'system':
      return '系统'
    default:
      return '事件'
  }
}

function buildEventsMap(events: CalendarEventDto[]): EventsMap {
  const map: EventsMap = new Map()

  events
    .slice()
    .sort((left, right) => {
      return (
        getSortableTimestamp(left.date) - getSortableTimestamp(right.date) ||
        getSortableTimestamp(left.createdAt) - getSortableTimestamp(right.createdAt)
      )
    })
    .forEach((event) => {
      const key = event.date.slice(0, 10)
      const current = map.get(key) ?? []
      current.push(event)
      map.set(key, current)
    })

  return map
}

export function CalendarMonthView({ month }: { month: string }) {
  const router = useRouter()
  const calendarSurfaceRef = useRef<HTMLElement | null>(null)
  const hoverHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [currentMonth, setCurrentMonth] = useState(() => parseMonth(month))
  const [selectedDate, setSelectedDate] = useState(() => parseMonth(month))
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const [hoverCardStyle, setHoverCardStyle] = useState<FloatingCardPosition | null>(null)
  const [pinnedDate, setPinnedDate] = useState<Date | null>(null)
  const [pinnedCardStyle, setPinnedCardStyle] = useState<FloatingCardPosition | null>(null)
  const [summaryMap, setSummaryMap] = useState<SummaryMap>(new Map())
  const [eventsMap, setEventsMap] = useState<EventsMap>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const nextMonth = parseMonth(month)
    setCurrentMonth(nextMonth)
    setHoveredDate(null)
    setHoverCardStyle(null)
    setPinnedDate(null)
    setPinnedCardStyle(null)
    setSelectedDate((previous) => {
      const today = new Date()
      if (format(nextMonth, 'yyyy-MM') === format(today, 'yyyy-MM')) {
        return today
      }

      if (isSameMonth(previous, nextMonth)) {
        return previous
      }

      return nextMonth
    })
  }, [month])

  useEffect(() => {
    return () => {
      if (hoverHideTimeoutRef.current) {
        clearTimeout(hoverHideTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const to = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

    setLoading(true)
    setError(null)

    Promise.all([getCalendarEventSummary({ from, to }), getCalendarEvents({ from, to })])
      .then(([summaryList, events]) => {
        setSummaryMap(new Map(summaryList.map((item) => [item.date, item])))
        setEventsMap(buildEventsMap(events))
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '月视图加载失败')
        setSummaryMap(new Map())
        setEventsMap(new Map())
      })
      .finally(() => {
        setLoading(false)
      })
  }, [currentMonth])

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth])
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth])

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 0 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
    })
  }, [monthEnd, monthStart])

  const activeDate = pinnedDate ?? hoveredDate ?? selectedDate
  const activeDateKey = format(activeDate, 'yyyy-MM-dd')
  const activeSummary = summaryMap.get(activeDateKey)
  const activeEvents = eventsMap.get(activeDateKey) ?? []

  const monthStats = useMemo(() => {
    const summaries = Array.from(summaryMap.values())

    return summaries.reduce(
      (acc, item) => {
        acc.total += item.totalCount
        acc.planned += item.plannedCount
        acc.completed += item.completedCount
        acc.canceled += item.canceledCount
        if (item.totalCount > 0) acc.activeDays += 1
        if (item.annotationLabel) acc.annotatedDays += 1
        return acc
      },
      { total: 0, planned: 0, completed: 0, canceled: 0, activeDays: 0, annotatedDays: 0 }
    )
  }, [summaryMap])

  const openMonth = (date: Date) => {
    router.push(`/calendar/month/${format(date, 'yyyy-MM')}`)
  }

  const openDay = (date: Date) => {
    router.push(`/calendar/day/${format(date, 'yyyy-MM-dd')}`)
  }

  const cancelHoverHide = () => {
    if (hoverHideTimeoutRef.current) {
      clearTimeout(hoverHideTimeoutRef.current)
      hoverHideTimeoutRef.current = null
    }
  }

  const scheduleHoverHide = () => {
    if (pinnedDate) return
    cancelHoverHide()
    hoverHideTimeoutRef.current = setTimeout(() => {
      setHoveredDate(null)
      setHoverCardStyle(null)
      hoverHideTimeoutRef.current = null
    }, 1000)
  }

  const getFloatingCardPosition = (element: HTMLElement): FloatingCardPosition | null => {
    const container = calendarSurfaceRef.current
    if (!container) return null

    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const cardWidth = 320
    const gap = 18
    const relativeTop = elementRect.top - containerRect.top - 6
    const preferredLeft = elementRect.right - containerRect.left + gap
    const fallbackLeft = elementRect.left - containerRect.left - cardWidth - gap
    const nextLeft =
      preferredLeft + cardWidth <= containerRect.width - 16
        ? preferredLeft
        : Math.max(16, fallbackLeft)

    return {
      top: Math.max(96, relativeTop),
      left: nextLeft,
    }
  }

  const placeHoverCard = (day: Date, element: HTMLElement) => {
    if (pinnedDate) return
    cancelHoverHide()
    const nextPosition = getFloatingCardPosition(element)
    if (!nextPosition) return

    setHoveredDate(day)
    setHoverCardStyle(nextPosition)
  }

  const pinCard = (day: Date, element: HTMLElement) => {
    cancelHoverHide()
    const nextPosition = getFloatingCardPosition(element)
    if (!nextPosition) return

    setSelectedDate(day)
    setPinnedDate(day)
    setPinnedCardStyle(nextPosition)
    setHoveredDate(null)
    setHoverCardStyle(null)
  }

  const releasePinnedCard = () => {
    setPinnedDate(null)
    setPinnedCardStyle(null)
  }

  const monthTitle = format(currentMonth, 'yyyy 年 M 月', { locale: zhCN })
  const monthCaption = format(currentMonth, 'MMMM', { locale: zhCN })
  const monthLead =
    monthStats.total > 0
      ? `这个月一共记录了 ${monthStats.total} 条事件，其中 ${monthStats.completed} 条已经落地，${monthStats.activeDays} 天留下了行动痕迹。`
      : '这个月还很安静，适合把新的计划、想法或作品先落进日历。'

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-content-secondary" />
      </div>
    )
  }

  return (
    <main className="min-h-screen px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:pl-24 lg:pr-8 lg:pt-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(246,248,247,0.94))] px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openMonth(subMonths(currentMonth, 1))}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white/80 text-content-primary transition-colors hover:bg-white"
                  aria-label="上个月"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-content-muted">Month View</div>
                  <h1 className="font-display text-3xl font-semibold tracking-[-0.05em] text-content-primary sm:text-4xl">
                    {monthTitle}
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => openMonth(addMonths(currentMonth, 1))}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white/80 text-content-primary transition-colors hover:bg-white"
                  aria-label="下个月"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-content-muted">
                  {monthCaption}
                </span>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-content-secondary">{monthLead}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => openMonth(new Date())}>
                <Clock3 className="mr-1 h-4 w-4" />
                回到本月
              </Button>
              <Button variant="outline" onClick={() => openDay(activeDate)}>
                打开当日页
              </Button>
              <Link
                href={`/ai-chat?quickDate=${activeDateKey}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-accent-primary/25 bg-accent-primary/8 px-4 py-2 text-sm font-medium text-accent-primary transition-colors hover:bg-accent-primary/12"
              >
                <Sparkles className="h-4 w-4" />
                AI 补记
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-[1.4rem] border border-ui-destructive/20 bg-ui-destructive-light px-4 py-3 text-sm text-ui-destructive">
            {error}
          </div>
        )}

        <section className="mt-6">
          <section
            ref={calendarSurfaceRef}
            className="relative rounded-[2.4rem] border border-black/8 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(246,248,247,0.92)_55%,rgba(241,245,243,0.94))] p-4 shadow-[0_24px_70px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:p-6"
          >
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-black/8 pb-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-content-primary">
                  月历总览
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-content-secondary">
                  把鼠标移到某一天就能在右侧预览详情，点击会固定选中，方便在移动端继续查看。
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-content-secondary">
                <span className="rounded-full bg-black/[0.04] px-3 py-1.5">{monthStats.total} 条事件</span>
                <span className="rounded-full bg-black/[0.04] px-3 py-1.5">{monthStats.activeDays} 天有记录</span>
                <span className="rounded-full bg-black/[0.04] px-3 py-1.5">{monthStats.annotatedDays} 天带附注</span>
              </div>
            </div>

            <div
              className="grid grid-cols-7 gap-2 sm:gap-3"
              onMouseEnter={cancelHoverHide}
              onMouseLeave={scheduleHoverHide}
            >
              {WEEKDAYS.map((weekday) => (
                <div
                  key={weekday}
                  className="px-1 py-2 text-center text-[11px] uppercase tracking-[0.22em] text-content-muted"
                >
                  {weekday}
                </div>
              ))}

              {calendarDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const summary = summaryMap.get(dateKey)
                const events = eventsMap.get(dateKey) ?? []
                const inCurrentMonth = isSameMonth(day, currentMonth)
                const hovered = hoveredDate ? isSameDay(day, hoveredDate) : false
                const selected = isSameDay(day, selectedDate)
                const today = isToday(day)

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onMouseEnter={(event) => placeHoverCard(day, event.currentTarget)}
                    onFocus={(event) => placeHoverCard(day, event.currentTarget)}
                    onClick={(event) => {
                      pinCard(day, event.currentTarget)
                    }}
                    className={cn(
                      'group relative min-h-[7.8rem] overflow-hidden rounded-[1.7rem] border p-3 text-left transition-all sm:min-h-[9.4rem] sm:p-3.5',
                      hovered || selected
                        ? 'border-black/8 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--theme-accent-primary)_18%,transparent),transparent_52%),linear-gradient(180deg,color-mix(in_srgb,var(--theme-accent-primary-subtle)_72%,white_28%),color-mix(in_srgb,var(--theme-surface-selected)_82%,white_18%))] shadow-[0_18px_40px_rgba(15,23,42,0.10)]'
                        : 'border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,250,249,0.88))] hover:border-accent-primary/20 hover:bg-accent-primary-subtle/35',
                      !inCurrentMonth && 'opacity-45',
                      today && !(hovered || selected) && 'border-accent-primary/18'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={cn(
                          'inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-semibold',
                          hovered || selected
                            ? 'bg-[color-mix(in_srgb,var(--theme-accent-primary)_82%,black_18%)] text-content-inverse'
                            : today
                              ? 'bg-accent-primary-subtle text-accent-primary'
                              : 'bg-black/[0.04] text-content-primary'
                        )}
                      >
                        {format(day, 'd')}
                      </div>
                      {(summary?.totalCount ?? 0) > 0 && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-1 text-[11px] font-medium shadow-sm',
                            hovered || selected
                              ? 'bg-[color-mix(in_srgb,var(--theme-accent-primary-subtle)_78%,white_22%)] text-accent-primary'
                              : 'bg-surface-primary text-content-primary'
                          )}
                        >
                          {summary?.totalCount}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-1">
                      {summary?.annotationLabel ? (
                        <p className="line-clamp-2 font-blog text-[13px] leading-5 text-content-primary">
                          {summary.annotationLabel}
                        </p>
                      ) : (
                        <p className="text-[12px] leading-5 text-content-muted">
                          {(summary?.totalCount ?? 0) > 0
                            ? `${summary?.plannedCount ?? 0} 条待推进，${summary?.completedCount ?? 0} 条已完成`
                            : '留白的一天，也许适合补一条注记。'}
                        </p>
                      )}

                      {events.slice(0, 2).map((event) => (
                        <div key={event.id} className="truncate text-[12px] text-content-secondary">
                          {formatEventTime(event)} {event.title}
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center gap-1.5">
                      {events.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className={cn('h-1.5 w-1.5 rounded-full', getStatusDotClassName(event.status))}
                        />
                      ))}
                      {summary?.annotationLabel && (
                        <span className="ml-1 h-2 w-2 rounded-full border border-surface-primary bg-accent-primary" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <div
            className={cn(
              'pointer-events-none absolute z-20 hidden w-[20rem] xl:block',
              (pinnedDate && pinnedCardStyle) || (hoveredDate && hoverCardStyle)
                ? 'opacity-100 transition-[opacity,left,top] duration-180 ease-out'
                : 'opacity-0 transition-[opacity,left,top] duration-120 ease-out'
            )}
            style={
              pinnedDate && pinnedCardStyle
                ? {
                    top: pinnedCardStyle.top,
                    left: pinnedCardStyle.left,
                  }
                : hoverCardStyle
                ? {
                    top: hoverCardStyle.top,
                    left: hoverCardStyle.left,
                  }
                : {
                    top: 96,
                    left: 24,
                }
            }
          >
            <div
              className={cn(
                'overflow-hidden rounded-[2rem] border border-black/10 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-accent-primary-subtle)_38%,white_62%),color-mix(in_srgb,var(--theme-surface-selected)_58%,white_42%))] shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl',
                pinnedDate ? 'pointer-events-auto' : 'pointer-events-none'
              )}
            >
              <div className="bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--theme-accent-primary)_14%,transparent),transparent_54%)] px-5 pb-4 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-content-muted">
                      {pinnedDate ? (
                        <>
                          <Pin className="h-3.5 w-3.5" />
                          Fixed Card
                        </>
                      ) : (
                        'Hover Card'
                      )}
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-content-primary">
                      {format(activeDate, 'M 月 d 日', { locale: zhCN })}
                    </h2>
                    <p className="mt-1 text-sm text-content-secondary">
                      {format(activeDate, 'EEEE', { locale: zhCN })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {pinnedDate ? (
                      <>
                        <Link
                          href={`/calendar/day/${activeDateKey}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-glass bg-surface-primary/90 text-content-primary transition-colors hover:bg-surface-selected"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={releasePinnedCard}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-glass bg-surface-primary/90 text-content-primary transition-colors hover:bg-surface-selected"
                          aria-label="关闭固定卡片"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-glass bg-surface-primary/90 text-content-primary">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-[1.15rem] bg-[color-mix(in_srgb,var(--theme-surface-selected)_82%,white_18%)] px-3 py-3 text-center shadow-sm">
                    <div className="text-lg font-semibold text-content-primary">{activeSummary?.totalCount ?? 0}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-content-muted">事件</div>
                  </div>
                  <div className="rounded-[1.15rem] bg-[color-mix(in_srgb,var(--theme-surface-selected)_82%,white_18%)] px-3 py-3 text-center shadow-sm">
                    <div className="text-lg font-semibold text-content-primary">{activeSummary?.plannedCount ?? 0}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-content-muted">计划</div>
                  </div>
                  <div className="rounded-[1.15rem] bg-[color-mix(in_srgb,var(--theme-surface-selected)_82%,white_18%)] px-3 py-3 text-center shadow-sm">
                    <div className="text-lg font-semibold text-content-primary">{activeSummary?.completedCount ?? 0}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-content-muted">完成</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-black/8 bg-[color-mix(in_srgb,var(--theme-surface-primary)_72%,transparent)] px-5 py-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-content-muted">当日记录摘录</div>

                <div className="mt-3 max-h-70 space-y-4 overflow-y-auto pr-1">
                  <div className="rounded-[1.4rem] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-surface-selected)_76%,white_24%),color-mix(in_srgb,var(--theme-accent-primary-subtle)_44%,white_56%))] px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-content-muted">Day Note</div>
                    <p className="mt-2 font-blog text-sm leading-7 text-content-primary">
                      {activeSummary?.annotationLabel || '这一天还没有留下附注，可以从 AI 快速创建或当日页补记。'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {activeEvents.length > 0 ? (
                      activeEvents.map((event, index) => (
                        <article
                          key={event.id}
                          className="overflow-hidden rounded-[1.45rem] border border-line-glass bg-[linear-gradient(145deg,color-mix(in_srgb,var(--theme-surface-primary)_84%,white_16%),color-mix(in_srgb,var(--theme-accent-primary-subtle)_26%,white_74%))] shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition-transform duration-200 hover:-translate-y-0.5"
                        >
                          <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 text-sm font-medium text-content-primary">
                                <span
                                  className={cn(
                                    'inline-flex h-8 w-8 items-center justify-center rounded-full',
                                    index % 2 === 0 ? 'bg-accent-primary/10' : 'bg-black/[0.05]'
                                  )}
                                >
                                  {getStatusIcon(event.status)}
                                </span>
                                <span className="truncate text-[15px]">{event.title}</span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-content-muted">
                                <span>{formatEventTime(event)}</span>
                                <span className="rounded-full bg-black/[0.04] px-2 py-0.5">
                                  {getSourceLabel(event)}
                                </span>
                                <span>{getStatusLabel(event.status)}</span>
                              </div>
                            </div>
                            {event.jumpUrl && (
                              <a
                                href={event.jumpUrl}
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-glass bg-surface-primary text-content-primary transition-colors hover:bg-surface-selected"
                              >
                                <ArrowUpRight className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          <div className="border-t border-line-glass/80 bg-accent-primary-subtle/35 px-4 py-3">
                            <p className="text-sm leading-7 text-content-secondary">
                              {event.description || '这条记录还没有补充说明，可以进入当日页继续整理它的上下文。'}
                            </p>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(245,248,246,0.92))] px-4 py-5 text-sm leading-7 text-content-secondary">
                        这一天还没有事件记录。你可以先去 AI 工作台快速生成，或者在当日页补一条手动事件。
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="mt-5 space-y-4 xl:hidden">
            <div className="overflow-hidden rounded-[2rem] border border-black/8 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-accent-primary-subtle)_38%,white_62%),color-mix(in_srgb,var(--theme-surface-selected)_58%,white_42%))] shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-sm">
              <div className="bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--theme-accent-primary)_12%,transparent),transparent_54%)] px-5 pb-4 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-content-muted">
                      {hoveredDate ? 'Hover Preview' : 'Pinned Day'}
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-content-primary">
                      {format(activeDate, 'M 月 d 日 EEEE', { locale: zhCN })}
                    </h2>
                  </div>
                  <Link
                    href={`/calendar/day/${activeDateKey}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white text-content-primary transition-colors hover:bg-black/[0.02]"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-4 rounded-[1.5rem] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-surface-selected)_76%,white_24%),color-mix(in_srgb,var(--theme-accent-primary-subtle)_44%,white_56%))] px-4 py-4 shadow-sm">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-content-muted">Day Note</div>
                  <p className="mt-2 font-blog text-sm leading-7 text-content-primary">
                    {activeSummary?.annotationLabel || '这一天还没有留下附注，可以从 AI 快速创建或当日页开始补记。'}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-[1.15rem] bg-[color-mix(in_srgb,var(--theme-surface-selected)_82%,white_18%)] px-3 py-3 text-center shadow-sm">
                    <div className="text-lg font-semibold text-content-primary">{activeSummary?.totalCount ?? 0}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-content-muted">事件</div>
                  </div>
                  <div className="rounded-[1.15rem] bg-[color-mix(in_srgb,var(--theme-surface-selected)_82%,white_18%)] px-3 py-3 text-center shadow-sm">
                    <div className="text-lg font-semibold text-content-primary">{activeSummary?.plannedCount ?? 0}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-content-muted">计划</div>
                  </div>
                  <div className="rounded-[1.15rem] bg-[color-mix(in_srgb,var(--theme-surface-selected)_82%,white_18%)] px-3 py-3 text-center shadow-sm">
                    <div className="text-lg font-semibold text-content-primary">{activeSummary?.completedCount ?? 0}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-content-muted">完成</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}
