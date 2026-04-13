'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { CalendarDayResponse, CalendarEventDto, CalendarEventStatus } from '@blog/types'
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  FilePenLine,
  FolderOpen,
  Loader2,
  MessageCircle,
  NotebookPen,
  Plus,
  Sparkles,
} from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthSession } from '@/hooks/useAuthSession'
import {
  getCalendarDay,
  saveCalendarAnnotation,
  updateCalendarEvent,
  createCalendarEvent,
} from '@/lib/calendar-api'
import { createProjectEntry } from '@/lib/projects-api'
import { createPhotoEntry, uploadPictureFile } from '@/lib/pictures-api'
import { cn } from '@/lib/utils'

type EventEditDraft = {
  title: string
  description: string
  date: string
  status: CalendarEventStatus
}

const STATUS_GROUPS: CalendarEventStatus[] = ['planned', 'completed', 'canceled']

function dateToHeading(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  return format(parsed, 'yyyy 年 M 月 d 日 EEEE', { locale: zhCN })
}

function formatEventDateLabel(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return format(parsed, 'M 月 d 日 HH:mm', { locale: zhCN })
}

function getSourceLabel(sourceType: CalendarEventDto['sourceType']) {
  switch (sourceType) {
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
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EventEditDraft | null>(null)
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null)

  const prevDate = useMemo(() => format(subDays(new Date(`${date}T00:00:00`), 1), 'yyyy-MM-dd'), [date])
  const nextDate = useMemo(() => format(addDays(new Date(`${date}T00:00:00`), 1), 'yyyy-MM-dd'), [date])

  const groupedEvents = useMemo(() => {
    const base = new Map<CalendarEventStatus, CalendarEventDto[]>([
      ['planned', []],
      ['completed', []],
      ['canceled', []],
    ])

    for (const event of dayData?.events ?? []) {
      base.get(event.status)?.push(event)
    }

    return base
  }, [dayData])

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
  }

  const handleSaveAnnotation = async () => {
    if (!user) return
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

    setPhotoSaving(true)
    try {
      const imageUrl = photoFile ? await uploadPictureFile(photoFile) : undefined
      await createPhotoEntry({
        title: photoTitle.trim() || undefined,
        description: photoDescription.trim() || undefined,
        imageUrl,
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
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-line-glass bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.7),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.88),rgba(242,246,252,0.76))] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.32em] text-content-muted">Day Hub</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-content-primary sm:text-4xl">
              {dateToHeading(date)}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-content-secondary">
              这里聚合当天已经发生的内容动作，也保留计划中的事项。每一条都可以继续跳转、补记或调整状态。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.4rem] border border-white/70 bg-white/72 px-4 py-3 backdrop-blur-sm">
              <div className="text-[11px] uppercase tracking-[0.26em] text-content-muted">Total</div>
              <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-content-primary">
                {dayData.summary.totalCount}
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-white/70 bg-white/72 px-4 py-3 backdrop-blur-sm">
              <div className="text-[11px] uppercase tracking-[0.26em] text-content-muted">Planned</div>
              <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-content-primary">
                {dayData.summary.plannedCount}
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-white/70 bg-white/72 px-4 py-3 backdrop-blur-sm">
              <div className="text-[11px] uppercase tracking-[0.26em] text-content-muted">Done</div>
              <div className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-content-primary">
                {dayData.summary.completedCount}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => router.push(`/calendar/day/${prevDate}`)}>
            前一天
          </Button>
          <Button variant="outline" onClick={() => router.push(`/calendar/day/${nextDate}`)}>
            后一天
          </Button>
          <Button variant="outline" onClick={() => router.push('/calendar/today')}>
            回到今天
          </Button>
          <Link
            href={`/ai-chat?quickDate=${date}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-accent-primary/25 bg-accent-primary/8 px-4 py-2 text-sm font-medium text-accent-primary transition-colors hover:bg-accent-primary/12"
          >
            <Sparkles className="h-4 w-4" />
            去 AI 入口快速创建
          </Link>
          <Link
            href="/blog/editor"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line-secondary bg-surface-primary px-4 py-2 text-sm font-medium text-content-primary transition-colors hover:bg-surface-secondary"
          >
            <NotebookPen className="h-4 w-4" />
            写博客
          </Link>
          <Link
            href="/thoughts/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line-secondary bg-surface-primary px-4 py-2 text-sm font-medium text-content-primary transition-colors hover:bg-surface-secondary"
          >
            <MessageCircle className="h-4 w-4" />
            记想法
          </Link>
        </div>
      </section>

      {error && (
        <div className="mt-4 rounded-2xl border border-ui-destructive/20 bg-ui-destructive-light px-4 py-3 text-sm text-ui-destructive">
          {error}
        </div>
      )}

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_24rem]">
        <div className="space-y-6">
          {STATUS_GROUPS.map((status) => {
            const events = groupedEvents.get(status) ?? []

            return (
              <div
                key={status}
                className="rounded-[1.8rem] border border-line-glass bg-white/74 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)] backdrop-blur-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-content-primary">{getStatusLabel(status)}</h2>
                    <p className="mt-1 text-xs text-content-secondary">
                      {status === 'planned'
                        ? '待做、待发布、待继续推进的事项'
                        : status === 'completed'
                          ? '已经完成并沉淀到数据库的动作'
                          : '暂时取消或不再继续的事项'}
                    </p>
                  </div>
                  <div className="rounded-full bg-surface-secondary px-3 py-1 text-xs font-medium text-content-secondary">
                    {events.length} 条
                  </div>
                </div>

                {events.length === 0 ? (
                  <div className="rounded-[1.4rem] border border-dashed border-line-secondary px-4 py-6 text-sm text-content-tertiary">
                    这部分暂时还是空的。
                  </div>
                ) : (
                  <div className="space-y-4">
                    {events.map((event) => {
                      const isEditing = editingEventId === event.id && editDraft
                      const savingThisEvent = updatingEventId === event.id

                      return (
                        <article
                          key={event.id}
                          className="rounded-[1.4rem] border border-line-glass bg-surface-glass/65 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-content-secondary">
                                <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-1">
                                  {getSourceIcon(event.sourceType)}
                                  {getSourceLabel(event.sourceType)}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-1">
                                  {event.status === 'completed' ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  ) : (
                                    <Clock3 className="h-3.5 w-3.5" />
                                  )}
                                  {formatEventDateLabel(event.date)}
                                </span>
                              </div>

                              {!isEditing ? (
                                <>
                                  <h3 className="mt-3 text-lg font-semibold text-content-primary">{event.title}</h3>
                                  {event.description && (
                                    <p className="mt-2 text-sm leading-7 text-content-secondary">
                                      {event.description}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <div className="mt-3 grid gap-3">
                                  <Input
                                    value={editDraft.title}
                                    onChange={(e) =>
                                      setEditDraft((prev) =>
                                        prev ? { ...prev, title: e.target.value } : prev
                                      )
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
                                        setEditDraft((prev) =>
                                          prev ? { ...prev, date: e.target.value } : prev
                                        )
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
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {event.jumpUrl && (
                                <a
                                  href={event.jumpUrl}
                                  className="inline-flex h-9 items-center justify-center rounded-md border border-line-secondary bg-surface-primary px-3 text-sm font-medium text-content-primary transition-colors hover:bg-surface-secondary"
                                >
                                  打开原对象
                                </a>
                              )}
                              {user && !isEditing && (
                                <Button variant="outline" size="sm" onClick={() => beginEdit(event)}>
                                  编辑
                                </Button>
                              )}
                              {user && isEditing && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => void handleSaveEventEdit(event.id)}
                                    disabled={savingThisEvent}
                                  >
                                    {savingThisEvent ? '保存中…' : '保存'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingEventId(null)
                                      setEditDraft(null)
                                    }}
                                  >
                                    取消
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <aside className="space-y-6">
          <section className="rounded-[1.8rem] border border-line-glass bg-white/76 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)] backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-content-primary">当日附注</h2>
                <p className="mt-1 text-sm leading-6 text-content-secondary">
                  用一句话概括这一天，或者补一条只有你自己关心的说明。
                </p>
              </div>
            </div>
            <textarea
              rows={4}
              value={annotationDraft}
              onChange={(e) => setAnnotationDraft(e.target.value)}
              disabled={!user}
              className="mt-4 w-full rounded-[1.2rem] border border-line-secondary bg-surface-primary px-3 py-3 text-sm text-content-primary placeholder:text-content-dim focus:outline-none focus:ring-2 focus:ring-line-focus disabled:cursor-not-allowed disabled:opacity-60"
              placeholder={user ? '例如：今天把日历事件流正式串起来了。' : '登录后可编辑当日附注'}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-content-tertiary">
                {user ? '保存后会显示在日历详情和月视图摘要里。' : '登录后可保存个人附注。'}
              </span>
              <Button onClick={() => void handleSaveAnnotation()} disabled={!user || annotationSaving}>
                {annotationSaving ? '保存中…' : '保存附注'}
              </Button>
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-line-glass bg-white/76 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)] backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-content-primary">快速新增</h2>
            <p className="mt-1 text-sm leading-6 text-content-secondary">
              在今天页直接补一条事件，或者把项目、照片也落到数据库里。
            </p>

            {!authChecked ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-content-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在检查登录状态…
              </div>
            ) : !user ? (
              <div className="mt-4 rounded-[1.2rem] border border-dashed border-line-secondary px-4 py-4 text-sm text-content-secondary">
                登录后可在这里直接新增个人事件、项目和照片。
              </div>
            ) : (
              <div className="mt-4 space-y-5">
                <div className="rounded-[1.2rem] border border-line-glass bg-surface-glass/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-content-primary">
                    <Plus className="h-4 w-4" />
                    当日事件
                  </div>
                  <div className="mt-3 space-y-3">
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
                      placeholder="补充说明"
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
                    <Button onClick={() => void handleCreateManualEvent()} disabled={manualSaving}>
                      {manualSaving ? '保存中…' : '新增事件'}
                    </Button>
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-line-glass bg-surface-glass/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-content-primary">
                    <FolderOpen className="h-4 w-4" />
                    项目记录
                  </div>
                  <div className="mt-3 space-y-3">
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
                      placeholder="项目描述"
                    />
                    <Button onClick={() => void handleCreateProject()} disabled={projectSaving}>
                      {projectSaving ? '创建中…' : '创建项目'}
                    </Button>
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-line-glass bg-surface-glass/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-content-primary">
                    <Camera className="h-4 w-4" />
                    照片记录
                  </div>
                  <div className="mt-3 space-y-3">
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
                    <label
                      className={cn(
                        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[1rem] border border-dashed border-line-secondary px-4 py-5 text-sm text-content-secondary transition-colors hover:border-accent-primary/40 hover:text-content-primary'
                      )}
                    >
                      <Camera className="h-5 w-5" />
                      <span>{photoFile ? photoFile.name : '选择一张图片上传，可选'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <Button onClick={() => void handleCreatePhoto()} disabled={photoSaving}>
                      {photoSaving ? '上传中…' : '新增照片'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </aside>
      </section>
    </main>
  )
}
