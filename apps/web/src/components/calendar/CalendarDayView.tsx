'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { CalendarDayResponse, CalendarEventDto, CalendarEventStatus } from '@blog/types'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  FilePenLine,
  FolderOpen,
  Loader2,
  MessageCircle,
  NotebookPen,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { addDays, format, subDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { useAuthSession } from '@/hooks/useAuthSession'
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarDay,
  saveCalendarAnnotation,
  updateCalendarEvent,
} from '@/lib/calendar-api'
import { getPerpetualCalendarInfo } from '@/lib/perpetual-calendar'
import { createPhotoEntry, uploadPictureFile } from '@/lib/pictures-api'
import { createProjectEntry } from '@/lib/projects-api'
import { cn } from '@/lib/utils'

type EventEditDraft = {
  title: string
  description: string
  date: string
  status: CalendarEventStatus
}

type EventStatusFilter = 'all' | CalendarEventStatus
type ComposerMode = 'event' | 'project' | 'photo'

function dateToHeading(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  return format(parsed, 'yyyy 年 M 月 d 日 EEEE', { locale: zhCN })
}

function formatTimelineTimeLabel(event: CalendarEventDto) {
  if (event.allDay || /^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    return '全天'
  }

  const parsed = new Date(event.date)
  if (Number.isNaN(parsed.getTime())) return event.date
  return format(parsed, 'HH:mm', { locale: zhCN })
}

function getSortableTimestamp(value: string) {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

function getSourceLabel(sourceType: CalendarEventDto['sourceType']) {
  switch (sourceType) {
    case 'manual':
      return '手动'
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

function getSourceIcon(sourceType: CalendarEventDto['sourceType']) {
  switch (sourceType) {
    case 'manual':
      return <Plus className="h-4 w-4" />
    case 'post':
      return <FilePenLine className="h-4 w-4" />
    case 'thought':
      return <MessageCircle className="h-4 w-4" />
    case 'project':
      return <FolderOpen className="h-4 w-4" />
    case 'photo':
      return <Camera className="h-4 w-4" />
    default:
      return <CalendarDays className="h-4 w-4" />
  }
}

function getStatusStyles(status: CalendarEventStatus) {
  switch (status) {
    case 'completed':
      return {
        dot: 'bg-emerald-500',
      }
    case 'canceled':
      return {
        dot: 'bg-slate-400',
      }
    default:
      return {
        dot: 'bg-sky-500',
      }
  }
}

function getEventPrimaryJumpUrl(event: CalendarEventDto, currentDate: string): string | null {
  if (!event.jumpUrl) return null
  const normalizedCurrentDayUrl = `/calendar/day/${currentDate}`
  return event.jumpUrl === normalizedCurrentDayUrl ? null : event.jumpUrl
}

function emptyEditDraft(event: CalendarEventDto): EventEditDraft {
  return {
    title: event.title,
    description: event.description ?? '',
    date: event.date.slice(0, 10),
    status: event.status,
  }
}

export function CalendarDayView({ date }: { date: string }) {
  const router = useRouter()
  const { user, authChecked } = useAuthSession()
  const [dayData, setDayData] = useState<CalendarDayResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [annotationDraft, setAnnotationDraft] = useState('')
  const [annotationSaving, setAnnotationSaving] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualDescription, setManualDescription] = useState('')
  const [manualStatus, setManualStatus] = useState<CalendarEventStatus>('planned')
  const [manualSaving, setManualSaving] = useState(false)
  const [projectTitle, setProjectTitle] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectHref, setProjectHref] = useState('')
  const [projectSaving, setProjectSaving] = useState(false)
  const [photoTitle, setPhotoTitle] = useState('')
  const [photoDescription, setPhotoDescription] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoSaving, setPhotoSaving] = useState(false)
  const [photoInputResetKey, setPhotoInputResetKey] = useState(0)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EventEditDraft | null>(null)
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null)
  const [activeStatusFilter, setActiveStatusFilter] = useState<EventStatusFilter>('all')
  const [composerMode, setComposerMode] = useState<ComposerMode>('event')

  const prevDate = useMemo(() => format(subDays(new Date(`${date}T00:00:00`), 1), 'yyyy-MM-dd'), [date])
  const nextDate = useMemo(() => format(addDays(new Date(`${date}T00:00:00`), 1), 'yyyy-MM-dd'), [date])
  const almanac = useMemo(() => getPerpetualCalendarInfo(date), [date])

  const sortedEvents = useMemo(() => {
    return [...(dayData?.events ?? [])].sort((left, right) => {
      return (
        getSortableTimestamp(left.date) - getSortableTimestamp(right.date) ||
        getSortableTimestamp(left.createdAt) - getSortableTimestamp(right.createdAt)
      )
    })
  }, [dayData])

  const filteredEvents = useMemo(() => {
    if (activeStatusFilter === 'all') {
      return sortedEvents
    }

    return sortedEvents.filter((event) => event.status === activeStatusFilter)
  }, [activeStatusFilter, sortedEvents])

  const filterItems = useMemo(
    () => [
      {
        key: 'all' as const,
        label: '全部',
        count: dayData?.summary.totalCount ?? 0,
      },
      {
        key: 'planned' as const,
        label: '计划中',
        count: dayData?.summary.plannedCount ?? 0,
      },
      {
        key: 'completed' as const,
        label: '已完成',
        count: dayData?.summary.completedCount ?? 0,
      },
      {
        key: 'canceled' as const,
        label: '已取消',
        count: dayData?.summary.canceledCount ?? 0,
      },
    ],
    [dayData]
  )

  const timelineHint =
    activeStatusFilter === 'all'
      ? '按时间查看这一天的记录、说明和状态，重要操作可以直接在卡片里完成。'
      : `当前只看${getStatusLabel(activeStatusFilter)}的事件。`

  const reload = async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await getCalendarDay(date)
      setDayData(next)
      setAnnotationDraft(next.annotation?.label ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setActiveStatusFilter('all')
    setComposerMode('event')
    setEditingEventId(null)
    setEditDraft(null)
    void reload()
  }, [date])

  const resetForms = () => {
    setManualTitle('')
    setManualDescription('')
    setManualStatus('planned')
    setProjectTitle('')
    setProjectDescription('')
    setProjectHref('')
    setPhotoTitle('')
    setPhotoDescription('')
    setPhotoFile(null)
    setPhotoInputResetKey((value) => value + 1)
  }

  const handleSaveAnnotation = async () => {
    if (!user) return
    setError(null)
    setAnnotationSaving(true)
    try {
      await saveCalendarAnnotation({
        date,
        label: annotationDraft.trim() || date,
      })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存附注失败')
    } finally {
      setAnnotationSaving(false)
    }
  }

  const handleCreateManualEvent = async () => {
    if (!manualTitle.trim()) {
      setError('请先填写事件标题')
      return
    }

    setError(null)
    setManualSaving(true)
    try {
      await createCalendarEvent({
        title: manualTitle.trim(),
        description: manualDescription.trim() || undefined,
        date,
        status: manualStatus,
        sourceType: 'manual',
      })
      resetForms()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建事件失败')
    } finally {
      setManualSaving(false)
    }
  }

  const handleCreateProject = async () => {
    if (!projectTitle.trim()) {
      setError('请先填写项目标题')
      return
    }

    setError(null)
    setProjectSaving(true)
    try {
      await createProjectEntry({
        title: projectTitle.trim(),
        description: projectDescription.trim() || undefined,
        href: projectHref.trim() || undefined,
        date,
        status: 'active',
      })
      resetForms()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建项目失败')
    } finally {
      setProjectSaving(false)
    }
  }

  const handleCreatePhoto = async () => {
    if (!photoFile && !photoTitle.trim()) {
      setError('请至少上传一张图片或填写照片标题')
      return
    }

    setError(null)
    setPhotoSaving(true)
    try {
      const uploaded = photoFile ? await uploadPictureFile(photoFile) : undefined
      await createPhotoEntry({
        title: photoTitle.trim() || undefined,
        description: photoDescription.trim() || undefined,
        imageUrl: uploaded?.url,
        mediaAssetId: uploaded?.mediaAssetId,
        date,
      })
      resetForms()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增照片失败')
    } finally {
      setPhotoSaving(false)
    }
  }

  const beginEdit = (event: CalendarEventDto) => {
    setEditingEventId(event.id)
    setEditDraft(emptyEditDraft(event))
  }

  const handleSaveEventEdit = async (eventId: string) => {
    if (!editDraft) return
    setError(null)
    setUpdatingEventId(eventId)
    try {
      await updateCalendarEvent(eventId, {
        title: editDraft.title.trim(),
        description: editDraft.description.trim() || null,
        date: editDraft.date,
        status: editDraft.status,
      })
      setEditingEventId(null)
      setEditDraft(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新事件失败')
    } finally {
      setUpdatingEventId(null)
    }
  }

  const handleDeleteEvent = async (eventId: string, title: string) => {
    const confirmed =
      typeof window === 'undefined'
        ? true
        : window.confirm(`确认删除日历计划「${title}」吗？删除后无法恢复。`)
    if (!confirmed) return

    setError(null)
    setUpdatingEventId(eventId)
    try {
      await deleteCalendarEvent(eventId)
      if (editingEventId === eventId) {
        setEditingEventId(null)
        setEditDraft(null)
      }
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除事件失败')
    } finally {
      setUpdatingEventId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-content-secondary" />
      </div>
    )
  }

  if (!dayData) {
    return <p className="text-sm text-ui-destructive">{error ?? '加载失败'}</p>
  }

  return (
    <main className="min-h-screen px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:pl-24 lg:pr-8 lg:pt-8">
      <div className="mx-auto max-w-7xl">
        <section className="grid gap-8 border-b border-black/8 pb-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.34em] text-content-muted">Day Hub</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-content-primary sm:text-5xl">
              {dateToHeading(date)}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-content-secondary">
              <span className="rounded-full bg-accent-primary/8 px-3 py-1 text-accent-primary">
                农历 {almanac.lunarMonthDay}
              </span>
              <span className="rounded-full bg-black/[0.04] px-3 py-1">
                {almanac.ganzhiYear}年 {almanac.ganzhiMonth}月 {almanac.ganzhiDay}日
              </span>
              {almanac.solarTerm && (
                <span className="rounded-full bg-black/[0.04] px-3 py-1">{almanac.solarTerm}</span>
              )}
            </div>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-content-secondary">
              {dayData.annotation?.label || '查看这一天聚合进数据库的记录，并在这里继续补记或调整。'}
            </p>

            <div className="mt-6 flex flex-wrap gap-2 rounded-[1.35rem] border border-black/8 bg-white/54 p-1.5 shadow-[0_12px_34px_rgba(15,23,42,0.05)] backdrop-blur-sm">
              <button
                type="button"
                onClick={() => router.push(`/calendar/day/${prevDate}`)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-medium text-content-secondary transition-colors hover:bg-white hover:text-content-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                前一天
              </button>
              <button
                type="button"
                onClick={() => router.push(`/calendar/day/${nextDate}`)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-medium text-content-secondary transition-colors hover:bg-white hover:text-content-primary"
              >
                后一天
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => router.push(`/calendar/month/${date.slice(0, 7)}`)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-medium text-content-secondary transition-colors hover:bg-white hover:text-content-primary"
              >
                <CalendarDays className="h-4 w-4" />
                月视图
              </button>
              <button
                type="button"
                onClick={() => router.push('/calendar/today')}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-medium text-content-secondary transition-colors hover:bg-white hover:text-content-primary"
              >
                回到今天
              </button>
              <Link
                href={{ pathname: '/ai-chat', query: { quickDate: date } }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent-primary px-4 text-sm font-medium text-content-inverse shadow-[0_10px_24px_color-mix(in_srgb,var(--theme-accent-primary)_20%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--theme-accent-primary)_88%,black_12%)]"
              >
                <Sparkles className="h-4 w-4" />
                去 AI 快速创建
              </Link>
              <Link
                href="/blog/editor"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-medium text-content-secondary transition-colors hover:bg-white hover:text-content-primary"
              >
                <NotebookPen className="h-4 w-4" />
                写博客
              </Link>
              <Link
                href="/thoughts/new"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-medium text-content-secondary transition-colors hover:bg-white hover:text-content-primary"
              >
                <MessageCircle className="h-4 w-4" />
                记想法
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/8 bg-white/68 p-5 backdrop-blur-sm">
            <div className="flex items-end justify-between gap-4 border-b border-black/8 pb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-content-muted">
                  Daily Summary
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-content-primary">
                  {String(dayData.summary.totalCount).padStart(2, '0')}
                </div>
              </div>
              <div className="text-right text-xs leading-6 text-content-muted">
                {dayData.summary.plannedCount} 待推进
                <br />
                {dayData.summary.completedCount} 已完成
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(
                dayData.summary.sourceTypes.length > 0
                  ? dayData.summary.sourceTypes
                  : (['manual'] as const)
              ).map((sourceType) => (
                <span
                  key={sourceType}
                  className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-content-secondary"
                >
                  {getSourceIcon(sourceType)}
                  {getSourceLabel(sourceType)}
                </span>
              ))}
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-[1.4rem] border border-ui-destructive/20 bg-ui-destructive-light px-4 py-3 text-sm text-ui-destructive">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="rounded-[2rem] border border-black/8 bg-white/68 p-5 backdrop-blur-sm">
            <div className="flex flex-col gap-4 border-b border-black/8 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-content-primary">
                  当日时间线
                </h2>
                <p className="mt-2 text-sm leading-7 text-content-secondary">{timelineHint}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {filterItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveStatusFilter(item.key)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      activeStatusFilter === item.key
                        ? 'border-accent-primary/25 bg-accent-primary/8 text-accent-primary'
                        : 'border-black/8 bg-white/70 text-content-secondary hover:bg-white hover:text-content-primary'
                    )}
                  >
                    <span>{item.label}</span>
                    <span className="text-[11px] opacity-75">{item.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="mt-5 rounded-[1.4rem] border border-dashed border-black/8 px-5 py-8 text-sm text-content-secondary">
                <div>当前筛选下还没有事件。</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveStatusFilter('all')}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-line-glass bg-white/78 px-3.5 text-xs font-medium text-content-primary shadow-sm transition-colors hover:bg-white"
                  >
                    查看全部
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerMode('event')}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-accent-primary/20 bg-accent-primary/8 px-3.5 text-xs font-medium text-accent-primary shadow-sm transition-colors hover:bg-accent-primary/12"
                  >
                    去补一条事件
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                {filteredEvents.map((event) => {
                  const isEditing = editingEventId === event.id && editDraft
                  const savingThisEvent = updatingEventId === event.id
                  const statusStyles = getStatusStyles(event.status)
                  const primaryJumpUrl = getEventPrimaryJumpUrl(event, date)

                  if (!isEditing) {
                    return (
                      <article
                        key={event.id}
                        className="rounded-[1.2rem] border border-black/8 bg-white/78 px-4 py-4 transition-colors hover:bg-white"
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                            <div className="w-16 shrink-0 text-sm font-medium text-content-secondary">
                              {formatTimelineTimeLabel(event)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-3">
                                <span
                                  className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', statusStyles.dot)}
                                />
                                <span
                                  title={getSourceLabel(event.sourceType)}
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-content-secondary"
                                >
                                  {getSourceIcon(event.sourceType)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-content-primary sm:text-[15px]">
                                    {event.title}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-content-secondary">
                                    <span className="rounded-full bg-black/[0.04] px-2 py-0.5">
                                      {getSourceLabel(event.sourceType)}
                                    </span>
                                    <span className="rounded-full bg-black/[0.04] px-2 py-0.5">
                                      {getStatusLabel(event.status)}
                                    </span>
                                    <span>{event.date.slice(0, 10)}</span>
                                  </div>
                                  {event.description && (
                                    <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-content-secondary">
                                      {event.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 sm:justify-end">
                              {primaryJumpUrl && (
                                <a
                                  href={primaryJumpUrl}
                                  className="inline-flex h-8 items-center justify-center rounded-full border border-line-glass bg-white/78 px-3 text-xs font-medium text-content-primary shadow-sm transition-colors hover:bg-white"
                                >
                                  打开详情
                                </a>
                              )}
                              {user && (
                                <button
                                  type="button"
                                  onClick={() => beginEdit(event)}
                                  className="inline-flex h-8 items-center justify-center rounded-full border border-line-glass bg-white/78 px-3 text-xs font-medium text-content-primary shadow-sm transition-colors hover:bg-white"
                                >
                                  编辑详情
                                </button>
                              )}
                              {user && (
                                <button
                                  type="button"
                                  disabled={savingThisEvent}
                                  onClick={() => {
                                    void handleDeleteEvent(event.id, event.title)
                                  }}
                                  className="inline-flex h-8 items-center justify-center rounded-full border border-red-200/80 bg-red-50/80 px-3 text-xs font-medium text-red-500 shadow-sm transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                                  删除
                                </button>
                              )}
                            </div>
                          </div>

                          {user && (
                            <div className="flex flex-wrap items-center gap-2 border-t border-black/8 pt-3">
                              <span className="text-xs text-content-secondary">快速改状态</span>
                              {(['planned', 'completed', 'canceled'] as CalendarEventStatus[]).map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  disabled={savingThisEvent || event.status === status}
                                  onClick={() => {
                                    void updateCalendarEvent(event.id, { status })
                                      .then(() => reload())
                                      .catch((err) =>
                                        setError(err instanceof Error ? err.message : '更新事件失败')
                                      )
                                  }}
                                  className={cn(
                                    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55',
                                    event.status === status
                                      ? 'border-accent-primary/25 bg-accent-primary/8 text-accent-primary'
                                      : 'border-black/8 bg-white text-content-secondary hover:bg-black/[0.02] hover:text-content-primary'
                                  )}
                                >
                                  {getStatusLabel(status)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    )
                  }

                  return (
                    <article
                      key={event.id}
                      className="rounded-[1.2rem] border border-black/8 bg-white/78 p-4"
                    >
                      <div className="flex items-center gap-2 text-xs text-content-secondary">
                        <span
                          className={cn('h-2.5 w-2.5 shrink-0 rounded-full', statusStyles.dot)}
                        />
                        <span>{getSourceLabel(event.sourceType)}</span>
                        <span>·</span>
                        <span>{getStatusLabel(event.status)}</span>
                      </div>

                      <div className="mt-3 grid gap-3">
                        <Input
                          value={editDraft.title}
                          onChange={(e) =>
                            setEditDraft((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                          }
                          placeholder="事件标题"
                        />
                        <textarea
                          value={editDraft.description}
                          onChange={(e) =>
                            setEditDraft((prev) =>
                              prev ? { ...prev, description: e.target.value } : prev
                            )
                          }
                          rows={3}
                          className="w-full rounded-md border border-line-secondary bg-surface-primary px-3 py-2 text-sm text-content-primary placeholder:text-content-dim focus:outline-none focus:ring-2 focus:ring-line-focus"
                          placeholder="补充描述"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            type="date"
                            value={editDraft.date}
                            onChange={(e) =>
                              setEditDraft((prev) => (prev ? { ...prev, date: e.target.value } : prev))
                            }
                          />
                          <select
                            value={editDraft.status}
                            onChange={(e) =>
                              setEditDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      status: e.target.value as CalendarEventStatus,
                                    }
                                  : prev
                              )
                            }
                            className="h-10 rounded-md border border-line-secondary bg-surface-primary px-3 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-line-focus"
                          >
                            <option value="planned">计划中</option>
                            <option value="completed">已完成</option>
                            <option value="canceled">已取消</option>
                          </select>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSaveEventEdit(event.id)}
                            disabled={savingThisEvent || !editDraft.title.trim()}
                            className="inline-flex h-9 items-center justify-center rounded-full bg-accent-primary px-4 text-xs font-medium text-content-inverse shadow-[0_10px_24px_color-mix(in_srgb,var(--theme-accent-primary)_18%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--theme-accent-primary)_88%,black_12%)] disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            {savingThisEvent ? '保存中…' : '保存'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEventId(null)
                              setEditDraft(null)
                            }}
                            className="inline-flex h-9 items-center justify-center rounded-full border border-line-glass bg-white/78 px-4 text-xs font-medium text-content-primary shadow-sm transition-colors hover:bg-white"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-black/8 bg-white/68 p-5 backdrop-blur-sm">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-content-muted">
                  Perpetual Calendar
                </div>
                <h2 className="mt-3 text-lg font-semibold text-content-primary">农历与黄历</h2>
                <p className="mt-2 text-sm leading-7 text-content-secondary">
                  {almanac.lunarYearLabel} · {almanac.zodiacLabel}
                  {almanac.festivals.length > 0 ? ` · ${almanac.festivals.slice(0, 3).join(' / ')}` : ''}
                </p>
              </div>

              <div className="mt-4 grid gap-3 text-sm">
                <div className="rounded-[1.2rem] bg-black/[0.03] px-4 py-3">
                  <div className="text-xs text-content-muted">干支</div>
                  <div className="mt-1 font-medium text-content-primary">
                    {almanac.ganzhiYear}年 {almanac.ganzhiMonth}月 {almanac.ganzhiDay}日
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-[1.2rem] bg-emerald-50 px-4 py-3">
                    <div className="text-xs font-medium text-emerald-700">宜</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(almanac.yi.length > 0 ? almanac.yi : ['平日整理']).map((item) => (
                        <span key={item} className="rounded-full bg-white/75 px-2 py-0.5 text-xs text-emerald-700">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.2rem] bg-rose-50 px-4 py-3">
                    <div className="text-xs font-medium text-rose-700">忌</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(almanac.ji.length > 0 ? almanac.ji : ['无特别忌项']).map((item) => (
                        <span key={item} className="rounded-full bg-white/75 px-2 py-0.5 text-xs text-rose-700">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs text-content-secondary">
                  <div className="rounded-[1rem] bg-black/[0.03] px-2 py-3">
                    <div className="text-content-muted">冲煞</div>
                    <div className="mt-1 font-medium text-content-primary">{almanac.chongSha}</div>
                  </div>
                  <div className="rounded-[1rem] bg-black/[0.03] px-2 py-3">
                    <div className="text-content-muted">财神</div>
                    <div className="mt-1 font-medium text-content-primary">{almanac.caiPosition}</div>
                  </div>
                  <div className="rounded-[1rem] bg-black/[0.03] px-2 py-3">
                    <div className="text-content-muted">喜神</div>
                    <div className="mt-1 font-medium text-content-primary">{almanac.xiPosition}</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-black/8 bg-white/68 p-5 backdrop-blur-sm">
              <div>
                <h2 className="text-lg font-semibold text-content-primary">当日附注</h2>
                <p className="mt-2 text-sm leading-7 text-content-secondary">
                  用一句话概括今天，方便月历里快速回看。
                </p>
              </div>
              <textarea
                rows={4}
                value={annotationDraft}
                onChange={(e) => setAnnotationDraft(e.target.value)}
                disabled={!user}
                className="mt-4 w-full rounded-[1.2rem] border border-line-secondary bg-surface-primary px-3 py-3 text-sm text-content-primary placeholder:text-content-dim focus:outline-none focus:ring-2 focus:ring-line-focus disabled:cursor-not-allowed disabled:opacity-60"
                placeholder={user ? '例如：今天把日历事件流真正串成了一个入口。' : '登录后可编辑当日附注'}
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-content-tertiary">
                  {user ? '保存后会出现在月历摘要里。' : '登录后可保存个人附注。'}
                </span>
                <button
                  type="button"
                  onClick={() => void handleSaveAnnotation()}
                  disabled={!user || annotationSaving}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-accent-primary px-4 text-xs font-medium text-content-inverse shadow-[0_10px_24px_color-mix(in_srgb,var(--theme-accent-primary)_18%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--theme-accent-primary)_88%,black_12%)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {annotationSaving ? '保存中…' : '保存附注'}
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-black/8 bg-white/68 p-5 backdrop-blur-sm">
              <div>
                <h2 className="text-lg font-semibold text-content-primary">快速新增</h2>
                <p className="mt-2 text-sm leading-7 text-content-secondary">
                  保留一个轻量补录入口，适合临时记一条，不替代上面的主时间线操作。
                </p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'event', label: '事件', icon: Plus },
                    { id: 'project', label: '项目', icon: FolderOpen },
                    { id: 'photo', label: '照片', icon: Camera },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon
                  const active = composerMode === item.id

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setComposerMode(item.id)}
                      className={cn(
                        'inline-flex flex-col items-center justify-center gap-1 rounded-[1rem] border px-3 py-3 text-sm font-medium transition-colors',
                        active
                          ? 'border-accent-primary/25 bg-accent-primary/8 text-accent-primary'
                          : 'border-black/8 bg-white/70 text-content-secondary hover:bg-white hover:text-content-primary'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  )
                })}
              </div>

              {!authChecked ? (
                <div className="mt-4 flex items-center gap-2 rounded-[1.2rem] border border-black/8 bg-white/78 px-4 py-4 text-sm text-content-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在检查登录状态…
                </div>
              ) : !user ? (
                <div className="mt-4 rounded-[1.2rem] border border-dashed border-black/8 px-4 py-4 text-sm text-content-secondary">
                  登录后可在这里直接新增个人事件、项目和照片。
                </div>
              ) : (
                <div className="mt-4 rounded-[1.3rem] border border-black/8 bg-white/78 p-4">
                  {composerMode === 'event' && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-content-primary">补一条当日事件</div>
                      <Input
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="例如：整理日历事件 API"
                      />
                      <textarea
                        value={manualDescription}
                        onChange={(e) => setManualDescription(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-line-secondary bg-surface-primary px-3 py-2 text-sm text-content-primary placeholder:text-content-dim focus:outline-none focus:ring-2 focus:ring-line-focus"
                        placeholder="补充说明，可选"
                      />
                      <select
                        value={manualStatus}
                        onChange={(e) => setManualStatus(e.target.value as CalendarEventStatus)}
                        className="h-10 w-full rounded-md border border-line-secondary bg-surface-primary px-3 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-line-focus"
                      >
                        <option value="planned">计划中</option>
                        <option value="completed">已完成</option>
                        <option value="canceled">已取消</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleCreateManualEvent()}
                        disabled={manualSaving || !manualTitle.trim()}
                        className="inline-flex h-10 w-full items-center justify-center rounded-full bg-accent-primary px-4 text-sm font-medium text-content-inverse shadow-[0_10px_24px_color-mix(in_srgb,var(--theme-accent-primary)_18%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--theme-accent-primary)_88%,black_12%)] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {manualSaving ? '保存中…' : '新增事件'}
                      </button>
                    </div>
                  )}

                  {composerMode === 'project' && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-content-primary">把项目记录落到当天</div>
                      <Input
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                        placeholder="项目标题"
                      />
                      <Input
                        value={projectHref}
                        onChange={(e) => setProjectHref(e.target.value)}
                        placeholder="项目链接，可选"
                      />
                      <textarea
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-line-secondary bg-surface-primary px-3 py-2 text-sm text-content-primary placeholder:text-content-dim focus:outline-none focus:ring-2 focus:ring-line-focus"
                        placeholder="项目描述，可选"
                      />
                      <button
                        type="button"
                        onClick={() => void handleCreateProject()}
                        disabled={projectSaving || !projectTitle.trim()}
                        className="inline-flex h-10 w-full items-center justify-center rounded-full bg-accent-primary px-4 text-sm font-medium text-content-inverse shadow-[0_10px_24px_color-mix(in_srgb,var(--theme-accent-primary)_18%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--theme-accent-primary)_88%,black_12%)] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {projectSaving ? '创建中…' : '创建项目'}
                      </button>
                    </div>
                  )}

                  {composerMode === 'photo' && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-content-primary">补一条照片记录</div>
                      <Input
                        value={photoTitle}
                        onChange={(e) => setPhotoTitle(e.target.value)}
                        placeholder="照片标题，可选"
                      />
                      <textarea
                        value={photoDescription}
                        onChange={(e) => setPhotoDescription(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-line-secondary bg-surface-primary px-3 py-2 text-sm text-content-primary placeholder:text-content-dim focus:outline-none focus:ring-2 focus:ring-line-focus"
                        placeholder="照片说明，可选"
                      />
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[1rem] border border-dashed border-black/8 px-4 py-5 text-sm text-content-secondary transition-colors hover:bg-black/[0.02] hover:text-content-primary">
                        <Camera className="h-5 w-5" />
                        <span>{photoFile ? photoFile.name : '选择一张图片上传，可选'}</span>
                        <input
                          key={photoInputResetKey}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void handleCreatePhoto()}
                        disabled={photoSaving || (!photoFile && !photoTitle.trim())}
                        className="inline-flex h-10 w-full items-center justify-center rounded-full bg-accent-primary px-4 text-sm font-medium text-content-inverse shadow-[0_10px_24px_color-mix(in_srgb,var(--theme-accent-primary)_18%,transparent)] transition-colors hover:bg-[color-mix(in_srgb,var(--theme-accent-primary)_88%,black_12%)] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {photoSaving ? '上传中…' : '新增照片'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-black/8 bg-white/68 p-5 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-content-primary">常用入口</h2>
              <div className="mt-4 space-y-2">
                <Link
                  href={{ pathname: '/ai-chat', query: { quickDate: date } }}
                  className="inline-flex w-full items-center justify-between rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-3 text-sm font-medium text-content-primary transition-colors hover:bg-white"
                >
                  <span>从 AI 入口补录今天</span>
                  <Sparkles className="h-4 w-4 text-accent-secondary" />
                </Link>
                <Link
                  href="/blog/editor"
                  className="inline-flex w-full items-center justify-between rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-3 text-sm font-medium text-content-primary transition-colors hover:bg-white"
                >
                  <span>继续写博客</span>
                  <FilePenLine className="h-4 w-4 text-accent-primary" />
                </Link>
                <Link
                  href="/thoughts/new"
                  className="inline-flex w-full items-center justify-between rounded-[1.15rem] border border-black/8 bg-white/78 px-4 py-3 text-sm font-medium text-content-primary transition-colors hover:bg-white"
                >
                  <span>记录一条新想法</span>
                  <MessageCircle className="h-4 w-4 text-accent-primary" />
                </Link>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  )
}
