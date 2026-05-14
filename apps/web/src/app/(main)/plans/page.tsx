'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { PlanSpaceSummaryDto } from '@blog/types'
import { ArrowRight, CalendarCheck, ClipboardList, Home, Loader2, Map, Plane, Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createPlanSpace, getPlanSpaces } from '@/lib/plan-spaces-api'
import { PLAN_SPACE_STATUS_LABELS } from '@/components/plans/plan-labels'

export default function PlansPage() {
  const [spaces, setSpaces] = useState<PlanSpaceSummaryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('wedding')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')

  const reload = async () => {
    setError(null)
    try {
      setSpaces(await getPlanSpaces())
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载专项计划失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const visibleSpaces = spaces.filter((space) => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return true
    return [space.title, space.type, PLAN_SPACE_STATUS_LABELS[space.status]].some((text) => text.toLowerCase().includes(keyword))
  })

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('请先填写专项计划名称')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const created = await createPlanSpace({
        title: title.trim(),
        type,
        icon: resolveTypeIcon(type),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        collaborationOn: true,
      })
      setTitle('')
      setStartDate('')
      setEndDate('')
      await reload()
      window.location.href = `/plans/${created.id}`
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建专项计划失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-content-secondary" />
      </div>
    )
  }

  return (
    <main className="min-h-screen px-4 pb-16 text-content-primary sm:px-6 lg:pr-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-[28px] border border-line-glass bg-surface-glass/35 p-4 shadow-[0_18px_60px_var(--theme-shadow-color)] backdrop-blur-md sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-content-muted">Plans</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal text-content-primary sm:text-3xl">计划空间</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-content-secondary">
                只保留入口和下一步。复杂拆解进空间里做，这一页负责让你轻快地开始。
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-line-glass bg-surface-glass/35 px-3 py-2 text-sm text-content-secondary backdrop-blur-sm">
              <CalendarCheck className="h-4 w-4 text-accent-primary" />
              <span>{spaces.length} 个空间</span>
            </div>
          </div>

          <section className="mt-5 border-t border-line-glass/70 pt-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(16rem,1fr)_auto_minmax(11rem,0.6fr)_minmax(11rem,0.6fr)_auto] xl:items-center">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleCreate()
                }}
                placeholder="新空间名称，例如：婚礼筹备"
                className="h-11 border-line-glass bg-surface-glass/45 backdrop-blur-sm"
              />
              <div className="flex gap-1 overflow-x-auto rounded-xl border border-line-glass/60 bg-surface-glass/25 p-1 backdrop-blur-sm">
                {PLAN_TYPE_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setType(option.value)}
                      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition-all ${
                        type === option.value
                          ? 'bg-surface-primary/80 text-content-primary shadow-[0_6px_18px_var(--theme-shadow-color)]'
                          : 'text-content-secondary hover:bg-surface-glass/45 hover:text-content-primary'
                      }`}
                      aria-pressed={type === option.value}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-11 border-line-glass bg-surface-glass/45 backdrop-blur-sm"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-11 border-line-glass bg-surface-glass/45 backdrop-blur-sm"
              />
              <Button
                type="button"
                onClick={() => void handleCreate()}
                disabled={saving || !title.trim()}
                className="h-11 gap-2 whitespace-nowrap rounded-xl bg-ui-primary px-5 text-content-inverse hover:bg-ui-primary-hover"
              >
                <Plus className="h-4 w-4" />
                {saving ? '创建中' : '进入'}
              </Button>
            </div>
          </section>
        </section>

        {error && (
          <div className="mt-6 rounded-lg border border-ui-destructive/20 bg-ui-destructive-light px-4 py-3 text-sm text-ui-destructive">
            {error}
          </div>
        )}

        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-normal text-content-primary">已有空间</h2>
              <p className="mt-1 text-sm text-content-secondary">少看一点，快进一点。</p>
            </div>
            <label className="relative block w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索空间"
                className="h-10 border-line-glass bg-surface-glass/35 pl-9 pr-9 backdrop-blur-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-content-muted transition-colors hover:bg-surface-glass/55 hover:text-content-primary"
                  aria-label="清空搜索"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-line-glass bg-surface-glass/28 shadow-[0_16px_46px_var(--theme-shadow-color)] backdrop-blur-md">
            {visibleSpaces.length > 0 ? (
              visibleSpaces.map((space) => (
                <PlanSpaceRow key={space.id} space={space} />
              ))
            ) : (
              <div className="px-5 py-12 text-center text-sm text-content-secondary">
                {spaces.length > 0 ? '没有匹配的计划空间。' : '还没有专项计划。先在上方创建一个轻量空间。'}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function PlanSpaceRow({ space }: { space: PlanSpaceSummaryDto }) {
  const Icon = PLAN_TYPE_OPTIONS.find((option) => option.value === space.type)?.icon ?? CalendarCheck

  return (
    <Link
      href={`/plans/${space.id}`}
      className="group grid gap-3 border-b border-line-glass/60 px-4 py-4 transition-colors last:border-b-0 hover:bg-surface-glass/45 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary-light/75 text-accent-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="max-w-full truncate text-base font-semibold tracking-normal text-content-primary">{space.title}</h3>
            <span className="rounded-md border border-line-glass/60 bg-surface-glass/35 px-2 py-0.5 text-xs text-content-secondary">
              {PLAN_SPACE_STATUS_LABELS[space.status]}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-content-secondary">{buildSpaceHint(space)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pl-13 sm:pl-0">
        <div className="flex items-center gap-3 text-xs text-content-muted">
          <span>{space.itemCount} 项</span>
          <span>{space.milestoneCount} 节点</span>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-content-muted transition-transform group-hover:translate-x-1 group-hover:text-content-primary" />
      </div>
    </Link>
  )
}

function buildSpaceHint(space: PlanSpaceSummaryDto) {
  if (space.nextItem) return `下一步：${space.nextItem.title} · ${space.nextItem.date}`
  return formatRange(space.startDate, space.endDate)
}

const PLAN_TYPE_OPTIONS = [
  { value: 'wedding', label: '婚礼', iconName: 'CalendarCheck', icon: CalendarCheck },
  { value: 'renovation', label: '装修', iconName: 'Home', icon: Home },
  { value: 'travel', label: '旅行', iconName: 'Plane', icon: Plane },
  { value: 'exam', label: '备考', iconName: 'ClipboardList', icon: ClipboardList },
  { value: 'general', label: '通用', iconName: 'Map', icon: Map },
]

function resolveTypeIcon(type: string) {
  return PLAN_TYPE_OPTIONS.find((option) => option.value === type)?.iconName ?? 'CalendarCheck'
}

function formatRange(startDate: string | null, endDate: string | null) {
  if (startDate && endDate) return `${startDate} 至 ${endDate}`
  if (startDate) return `${startDate} 开始`
  if (endDate) return `${endDate} 前完成`
  return '未设置起止日期'
}
