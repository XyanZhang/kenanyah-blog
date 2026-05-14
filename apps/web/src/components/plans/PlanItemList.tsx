'use client'

import { useMemo, useState } from 'react'
import type { PlanItemDto, PlanItemStatus } from '@blog/types'
import { Columns3, Flag, ListTree, Trash2, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLAN_PRIORITY_LABELS, PLAN_STATUS_LABELS, PLAN_STATUS_ORDER } from './plan-labels'

type PlanItemListProps = {
  items: PlanItemDto[]
  canEdit: boolean
  onUpdateStatus: (itemId: string, status: PlanItemStatus) => Promise<void>
  onDelete: (itemId: string) => Promise<void>
}

type StatusFilter = 'all' | PlanItemStatus
type PlanViewMode = 'timeline' | 'board'

export function PlanItemList({ items, canEdit, onUpdateStatus, onDelete }: PlanItemListProps) {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [viewMode, setViewMode] = useState<PlanViewMode>('timeline')
  const [busyId, setBusyId] = useState<string | null>(null)
  const counts = useMemo(() => {
    return PLAN_STATUS_ORDER.reduce(
      (acc, status) => ({ ...acc, [status]: items.filter((item) => item.status === status).length }),
      {} as Record<PlanItemStatus, number>
    )
  }, [items])

  const filteredItems = filter === 'all' ? items : items.filter((item) => item.status === filter)
  const groupedByDate = useMemo(() => groupItemsByDate(filteredItems), [filteredItems])
  const groupedByStatus = useMemo(() => {
    return PLAN_STATUS_ORDER.map((status) => ({
      status,
      items: filteredItems.filter((item) => item.status === status),
    }))
  }, [filteredItems])

  const runItemAction = async (itemId: string, action: () => Promise<void>) => {
    setBusyId(itemId)
    try {
      await action()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="rounded-[28px] border border-line-glass bg-surface-glass/32 p-4 shadow-[0_18px_46px_var(--theme-shadow-color)] backdrop-blur-md">
      <div className="flex flex-col gap-3 border-b border-line-glass/70 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-content-primary">计划编排</h2>
          <p className="mt-1 text-sm text-content-secondary">时间线看“哪天做什么”，看板看“现在卡在哪”。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-line-glass/70 bg-surface-glass/28 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors',
                viewMode === 'timeline' ? 'bg-ui-primary text-content-inverse' : 'text-content-secondary hover:bg-surface-glass/55'
              )}
            >
              <ListTree className="h-3.5 w-3.5" />
              时间线
            </button>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors',
                viewMode === 'board' ? 'bg-ui-primary text-content-inverse' : 'text-content-secondary hover:bg-surface-glass/55'
              )}
            >
              <Columns3 className="h-3.5 w-3.5" />
              看板
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')} label="全部" count={items.length} />
        {PLAN_STATUS_ORDER.map((status) => (
          <FilterButton
            key={status}
            active={filter === status}
            onClick={() => setFilter(status)}
            label={PLAN_STATUS_LABELS[status]}
            count={counts[status]}
          />
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line-glass px-4 py-8 text-sm text-content-secondary">
          当前筛选下还没有安排。
        </div>
      ) : viewMode === 'board' ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-5">
          {groupedByStatus.map((group) => (
            <section key={group.status} className="min-h-48 rounded-2xl border border-line-glass/70 bg-surface-glass/24 p-3 backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-content-primary">{PLAN_STATUS_LABELS[group.status]}</h3>
                <span className="rounded-md bg-surface-glass/45 px-2 py-0.5 text-xs text-content-secondary">{group.items.length}</span>
              </div>
              <div className="grid gap-2">
                {group.items.length > 0 ? (
                  group.items.map((item) => (
                    <PlanItemCard
                      key={item.id}
                      item={item}
                      canEdit={canEdit}
                      busy={busyId === item.id}
                      onUpdateStatus={(status) => runItemAction(item.id, () => onUpdateStatus(item.id, status))}
                      onDelete={() => runItemAction(item.id, () => onDelete(item.id))}
                      compact
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-line-glass/70 px-3 py-6 text-center text-xs text-content-muted">
                    暂无
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {groupedByDate.map((group) => (
            <section key={group.date} className="grid gap-3 lg:grid-cols-[8rem_minmax(0,1fr)]">
              <div className="lg:pt-3">
                <div className="text-sm font-semibold text-content-primary">{formatDate(group.date)}</div>
                <div className="mt-1 text-xs text-content-secondary">{group.items.length} 项安排</div>
              </div>
              <div className="grid gap-3">
                {group.items.map((item) => (
                  <PlanItemCard
                    key={item.id}
                    item={item}
                    canEdit={canEdit}
                    busy={busyId === item.id}
                    onUpdateStatus={(status) => runItemAction(item.id, () => onUpdateStatus(item.id, status))}
                    onDelete={() => runItemAction(item.id, () => onDelete(item.id))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

function PlanItemCard(props: {
  item: PlanItemDto
  canEdit: boolean
  busy: boolean
  compact?: boolean
  onUpdateStatus: (status: PlanItemStatus) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const { item, canEdit, busy, compact, onUpdateStatus, onDelete } = props

  return (
    <article className="rounded-2xl border border-line-glass/70 bg-surface-glass/34 p-3 shadow-[0_8px_22px_var(--theme-shadow-color)] backdrop-blur-sm transition-colors hover:bg-surface-glass/48">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={cn('font-semibold text-content-primary', compact ? 'text-sm' : 'text-base')}>{item.title}</h3>
              {item.isMilestone && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent-primary/10 px-2 py-1 text-xs font-medium text-accent-primary">
                  <Flag className="h-3.5 w-3.5" />
                  关键
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-content-secondary">
              <span className={cn('rounded-md px-2 py-1 font-medium', getStatusClass(item.status))}>
                {PLAN_STATUS_LABELS[item.status]}
              </span>
              <span className="rounded-md bg-surface-glass/45 px-2 py-1">{formatTime(item)}</span>
              <span className="rounded-md bg-surface-glass/45 px-2 py-1">{PLAN_PRIORITY_LABELS[item.priority]}优先级</span>
            </div>
          </div>

          {canEdit && (
            <div className="flex shrink-0 items-center gap-2">
              <select
                value={item.status}
                disabled={busy}
                onChange={(event) => void onUpdateStatus(event.target.value as PlanItemStatus)}
                className="h-8 rounded-md border border-line-glass bg-surface-glass/45 px-2 text-xs text-content-primary backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-line-focus"
              >
                {PLAN_STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>{PLAN_STATUS_LABELS[status]}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onDelete()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200/70 bg-red-50/70 text-red-500 transition-colors hover:bg-red-100/80 disabled:opacity-50"
                aria-label="删除安排"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {item.description && !compact && (
          <p className="whitespace-pre-wrap text-sm leading-6 text-content-secondary">{item.description}</p>
        )}
        <div className="flex flex-wrap gap-2 text-xs text-content-secondary">
          {item.assignee && (
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-glass/45 px-2 py-1">
              <UserRound className="h-3.5 w-3.5" />
              {item.assignee}
            </span>
          )}
          {item.category && <span className="rounded-md bg-surface-glass/45 px-2 py-1">{item.category}</span>}
          {compact && <span className="rounded-md bg-surface-glass/45 px-2 py-1">{item.date}</span>}
        </div>
      </div>
    </article>
  )
}

function FilterButton(props: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors',
        props.active
          ? 'border-accent-primary/25 bg-accent-primary/10 text-accent-primary'
          : 'border-line-glass/70 bg-surface-glass/28 text-content-secondary hover:bg-surface-glass/55 hover:text-content-primary'
      )}
    >
      {props.label}
      <span className="opacity-75">{props.count}</span>
    </button>
  )
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return `${parsed.getMonth() + 1}月${parsed.getDate()}日`
}

function formatTime(item: PlanItemDto) {
  if (item.allDay || (!item.startTime && !item.endTime)) return '全天'
  if (item.startTime && item.endTime) return `${item.startTime}-${item.endTime}`
  return item.startTime ?? item.endTime ?? '全天'
}

function groupItemsByDate(items: PlanItemDto[]) {
  const map = new Map<string, PlanItemDto[]>()
  for (const item of items) {
    const current = map.get(item.date) ?? []
    current.push(item)
    map.set(item.date, current)
  }

  return [...map.entries()].map(([date, groupItems]) => ({
    date,
    items: groupItems,
  }))
}

function getStatusClass(status: PlanItemStatus) {
  if (status === 'done') return 'bg-emerald-50 text-emerald-700'
  if (status === 'blocked') return 'bg-amber-50 text-amber-700'
  if (status === 'canceled') return 'bg-slate-100 text-slate-600'
  if (status === 'in_progress') return 'bg-sky-50 text-sky-700'
  return 'bg-black/[0.04] text-content-secondary'
}
