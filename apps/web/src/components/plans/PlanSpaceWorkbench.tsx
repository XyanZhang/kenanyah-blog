'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import type { PlanItemStatus, PlanSharePermission, PlanSpaceDto } from '@blog/types'
import { AlertTriangle, CalendarCheck, Copy, Flag, Loader2, Share2, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PlanItemPayload } from '@/lib/plan-spaces-api'
import { cn } from '@/lib/utils'
import { PlanItemComposer } from './PlanItemComposer'
import { PlanItemList } from './PlanItemList'
import { PLAN_SPACE_STATUS_LABELS } from './plan-labels'

type WorkbenchActions = {
  createItem: (payload: PlanItemPayload) => Promise<void>
  updateItemStatus: (itemId: string, status: PlanItemStatus) => Promise<void>
  deleteItem: (itemId: string) => Promise<void>
}

type PlanSpaceWorkbenchProps = {
  space: PlanSpaceDto
  permission?: PlanSharePermission
  shareUrl?: string
  actions: WorkbenchActions
}

export function PlanSpaceWorkbench({ space, permission = 'edit', shareUrl, actions }: PlanSpaceWorkbenchProps) {
  const [copied, setCopied] = useState(false)
  const canEdit = permission === 'edit'
  const stats = useMemo(() => buildStats(space), [space])
  const milestones = space.items.filter((item) => item.isMilestone)
  const blockedItems = space.items.filter((item) => item.status === 'blocked')
  const ownerShareUrl = shareUrl ?? (typeof window !== 'undefined' ? `${window.location.origin}/plans/share/${space.shareToken}` : '')

  const copyShareUrl = async () => {
    if (!ownerShareUrl || typeof navigator === 'undefined') return
    await navigator.clipboard.writeText(ownerShareUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <main className="min-h-screen px-4 pb-16 text-content-primary sm:px-6 lg:pr-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-6">
          <section className="rounded-[28px] border border-line-glass bg-surface-glass/35 p-5 shadow-[0_18px_60px_var(--theme-shadow-color)] backdrop-blur-md">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <Link href="/plans" className="text-sm font-medium text-content-secondary transition-colors hover:text-content-primary">
                  专项计划
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary-light/75 text-accent-primary">
                    <CalendarCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h1 className="text-3xl font-semibold tracking-normal text-content-primary sm:text-4xl">{space.title}</h1>
                    <p className="mt-1 text-sm text-content-secondary">{formatRange(space.startDate, space.endDate)}</p>
                  </div>
                </div>
                {space.description && <p className="mt-4 max-w-2xl text-sm leading-7 text-content-secondary">{space.description}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                {ownerShareUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void copyShareUrl()}
                    className="gap-2 rounded-xl border-line-glass bg-surface-glass/35 backdrop-blur-sm"
                  >
                    {copied ? <Copy className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                    {copied ? '已复制' : '复制协作链接'}
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <Metric label="完成度" value={`${stats.progress}%`} />
              <Metric label="安排" value={String(space.itemCount)} />
              <Metric label="待推进" value={String(stats.openCount)} />
              <Metric label="关键节点" value={String(space.milestoneCount)} />
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <FocusPanel
              icon={<Target className="h-4 w-4" />}
              label="下一步"
              title={space.nextItem?.title ?? '先添加第一条安排'}
              meta={space.nextItem ? `${space.nextItem.date} · ${space.nextItem.assignee ?? '未分配'}` : '从右侧新增安排开始'}
            />
            <FocusPanel
              icon={<AlertTriangle className="h-4 w-4" />}
              label="受阻"
              title={blockedItems[0]?.title ?? '暂无受阻事项'}
              meta={blockedItems.length > 0 ? `${blockedItems.length} 项需要处理` : '推进状态良好'}
            />
            <FocusPanel
              icon={<Flag className="h-4 w-4" />}
              label="最近关键节点"
              title={milestones[0]?.title ?? '暂无关键节点'}
              meta={milestones[0]?.date ?? '勾选关键节点后同步到全站日历'}
            />
          </section>

          <PlanItemList
            items={space.items}
            canEdit={canEdit}
            onUpdateStatus={actions.updateItemStatus}
            onDelete={actions.deleteItem}
          />
        </section>

        <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
          <section className="rounded-[24px] border border-line-glass bg-surface-glass/32 p-4 shadow-[0_16px_46px_var(--theme-shadow-color)] backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-content-primary">空间状态</h2>
                <p className="mt-1 text-sm text-content-secondary">{PLAN_SPACE_STATUS_LABELS[space.status]}</p>
              </div>
              <span className={cn('h-3 w-3 rounded-full', stats.progress === 100 ? 'bg-emerald-500' : 'bg-accent-primary')} />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-glass/45">
              <div className="h-full rounded-full bg-accent-primary transition-all" style={{ width: `${stats.progress}%` }} />
            </div>
          </section>

          <PlanItemComposer defaultDate={space.startDate} disabled={!canEdit} onSubmit={actions.createItem} />

          <section className="rounded-[24px] border border-line-glass bg-surface-glass/32 p-4 shadow-[0_16px_46px_var(--theme-shadow-color)] backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-accent-primary" />
              <h2 className="text-lg font-semibold text-content-primary">关键节点</h2>
            </div>
            <div className="mt-4 space-y-3">
              {milestones.length > 0 ? (
                milestones.map((item) => (
                  <div key={item.id} className="rounded-xl border border-line-glass/60 bg-surface-glass/35 px-3 py-3 text-sm">
                    <div className="font-medium text-content-primary">{item.title}</div>
                    <div className="mt-1 text-xs text-content-secondary">{item.date}</div>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-content-secondary">还没有关键节点。勾选关键节点后，它会同步到全站日历。</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}

export function PlanSpaceLoading() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-content-secondary" />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line-glass/60 bg-surface-glass/35 px-4 py-3 backdrop-blur-sm">
      <div className="text-2xl font-semibold tracking-normal text-content-primary">{value}</div>
      <div className="mt-1 text-xs text-content-secondary">{label}</div>
    </div>
  )
}

function FocusPanel(props: { icon: ReactNode; label: string; title: string; meta: string }) {
  return (
    <section className="rounded-[22px] border border-line-glass bg-surface-glass/28 p-4 shadow-[0_12px_30px_var(--theme-shadow-color)] backdrop-blur-md">
      <div className="flex items-center gap-2 text-xs font-medium text-content-muted">
        <span className="text-accent-primary">{props.icon}</span>
        {props.label}
      </div>
      <div className="mt-2 line-clamp-2 text-sm font-semibold text-content-primary">{props.title}</div>
      <div className="mt-1 text-xs text-content-secondary">{props.meta}</div>
    </section>
  )
}

function buildStats(space: PlanSpaceDto) {
  const actionable = space.items.filter((item) => item.status !== 'canceled')
  const done = actionable.filter((item) => item.status === 'done').length
  const progress = actionable.length ? Math.round((done / actionable.length) * 100) : 0
  return {
    progress,
    openCount: space.items.filter((item) => !['done', 'canceled'].includes(item.status)).length,
  }
}

function formatRange(startDate: string | null, endDate: string | null) {
  if (startDate && endDate) return `${startDate} 至 ${endDate}`
  if (startDate) return `${startDate} 开始`
  if (endDate) return `${endDate} 前完成`
  return '未设置起止日期'
}
