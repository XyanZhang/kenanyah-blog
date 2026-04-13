'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { getCalendarAnnotations, getPublishedPostDates, saveCalendarAnnotation } from '@/lib/calendar-api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Label,
  Input,
} from '@/components/ui'

interface CalendarCardProps {
  card: DashboardCard
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function CalendarCard({ card }: CalendarCardProps) {
  const config = card.config as CalendarCardConfig
  const [currentDate, setCurrentDate] = useState(new Date())
  const [annotations, setAnnotations] = useState<Map<string, string>>(new Map())
  const [annotationDialogOpen, setAnnotationDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [annotationLabel, setAnnotationLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [annotationError, setAnnotationError] = useState<string | null>(null)
  const [postDatesSet, setPostDatesSet] = useState<Set<string>>(new Set())

  const showAnnotations = config.showAnnotations !== false

  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate])
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate])

  useEffect(() => {
    if (!showAnnotations) return
    const from = format(monthStart, 'yyyy-MM-dd')
    const to = format(monthEnd, 'yyyy-MM-dd')
    getCalendarAnnotations({ from, to })
      .then((list) => {
        const map = new Map<string, string>()
        list.forEach((a) => map.set(a.date, a.label))
        setAnnotations(map)
      })
      .catch(() => setAnnotations(new Map()))
  }, [showAnnotations, monthStart, monthEnd])

  useEffect(() => {
    if (!config.showPostDots) return
    const from = format(monthStart, 'yyyy-MM-dd')
    const to = format(monthEnd, 'yyyy-MM-dd')
    getPublishedPostDates({ from, to })
      .then((dates) => setPostDatesSet(new Set(dates)))
      .catch(() => setPostDatesSet(new Set()))
  }, [config.showPostDots, monthStart, monthEnd])

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

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const hasPost = (date: Date) => {
    return postDatesSet.has(format(date, 'yyyy-MM-dd'))
  }

  const getAnnotation = (date: Date) => {
    return annotations.get(format(date, 'yyyy-MM-dd')) ?? null
  }

  const openAnnotationDialog = (date: Date) => {
    setSelectedDate(date)
    setAnnotationLabel(getAnnotation(date) ?? '')
    setAnnotationDialogOpen(true)
  }

  const handleSaveAnnotation = async () => {
    if (!selectedDate) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    setSaving(true)
    setAnnotationError(null)
    try {
      await saveCalendarAnnotation({ date: dateStr, label: annotationLabel.trim() || dateStr })
      setAnnotations((prev) => {
        const next = new Map(prev)
        next.set(dateStr, annotationLabel.trim() || dateStr)
        return next
      })
      setAnnotationDialogOpen(false)
      setSelectedDate(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '保存失败'
      setAnnotationError(msg.includes('401') || msg.includes('未登录') ? '请先登录后再保存标注' : msg)
    } finally {
      setSaving(false)
    }
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
          const dayAnnotation = getAnnotation(day)

          return (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (showAnnotations) openAnnotationDialog(day)
              }}
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
              {showAnnotations && dayAnnotation && isCurrentMonth && (
                <span
                  className="absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent-secondary"
                  title={dayAnnotation}
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
        {showAnnotations && (
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-secondary" />
            <span>标注</span>
          </div>
        )}
      </div>

      <Dialog open={annotationDialogOpen} onOpenChange={setAnnotationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? format(selectedDate, 'yyyy年M月d日', { locale: zhCN }) : '标注日期'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="annotation-label">标注内容</Label>
              <Input
                id="annotation-label"
                value={annotationLabel}
                onChange={(e) => setAnnotationLabel(e.target.value)}
                placeholder="例如：生日、纪念日、待办…"
              />
            </div>
            <p className="text-xs text-content-muted">登录后可保存标注，未登录时仅可查看当月已有标注。</p>
            {annotationError && (
              <p className="text-sm text-ui-destructive">{annotationError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnotationDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveAnnotation} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
