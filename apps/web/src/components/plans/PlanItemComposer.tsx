'use client'

import { useState } from 'react'
import type { PlanItemPriority, PlanItemStatus } from '@blog/types'
import { CalendarPlus, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PlanItemPayload } from '@/lib/plan-spaces-api'
import { PLAN_PRIORITY_LABELS, PLAN_PRIORITY_ORDER, PLAN_STATUS_LABELS, PLAN_STATUS_ORDER } from './plan-labels'

type PlanItemComposerProps = {
  defaultDate?: string | null
  disabled?: boolean
  onSubmit: (payload: PlanItemPayload) => Promise<void>
}

export function PlanItemComposer({ defaultDate, disabled, onSubmit }: PlanItemComposerProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate ?? today)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<PlanItemStatus>('planned')
  const [priority, setPriority] = useState<PlanItemPriority>('medium')
  const [isMilestone, setIsMilestone] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || disabled) return

    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        allDay: !startTime && !endTime,
        status,
        priority,
        assignee: assignee.trim() || undefined,
        category: category.trim() || undefined,
        isMilestone,
      })
      setTitle('')
      setDescription('')
      setStartTime('')
      setEndTime('')
      setAssignee('')
      setCategory('')
      setStatus('planned')
      setPriority('medium')
      setIsMilestone(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-[24px] border border-line-glass bg-surface-glass/32 p-4 shadow-[0_16px_46px_var(--theme-shadow-color)] backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-content-primary">新增安排</h2>
          <p className="mt-1 text-sm text-content-secondary">普通安排只留在专项空间，标记关键节点后才同步到全站日历。</p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent-primary-light/75 text-accent-primary">
          <CalendarPlus className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="要推进的事项"
          disabled={disabled}
          className="border-line-glass bg-surface-glass/45 backdrop-blur-sm"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="w-full rounded-md border border-line-glass bg-surface-glass/45 px-3 py-2 text-sm text-content-primary placeholder:text-content-dim backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-line-focus"
          placeholder="补充说明、确认口径或注意事项"
          disabled={disabled}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={disabled} className="border-line-glass bg-surface-glass/45 backdrop-blur-sm" />
          <Input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} disabled={disabled} className="border-line-glass bg-surface-glass/45 backdrop-blur-sm" />
          <Input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} disabled={disabled} className="border-line-glass bg-surface-glass/45 backdrop-blur-sm" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="负责人" disabled={disabled} className="border-line-glass bg-surface-glass/45 backdrop-blur-sm" />
          <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="分类，如 场地 / 摄影 / 证件" disabled={disabled} className="border-line-glass bg-surface-glass/45 backdrop-blur-sm" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as PlanItemStatus)}
            disabled={disabled}
            className="h-10 rounded-md border border-line-glass bg-surface-glass/45 px-3 text-sm text-content-primary backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-line-focus"
          >
            {PLAN_STATUS_ORDER.map((value) => (
              <option key={value} value={value}>{PLAN_STATUS_LABELS[value]}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as PlanItemPriority)}
            disabled={disabled}
            className="h-10 rounded-md border border-line-glass bg-surface-glass/45 px-3 text-sm text-content-primary backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-line-focus"
          >
            {PLAN_PRIORITY_ORDER.map((value) => (
              <option key={value} value={value}>{PLAN_PRIORITY_LABELS[value]}优先级</option>
            ))}
          </select>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-content-secondary">
          <input
            type="checkbox"
            checked={isMilestone}
            onChange={(event) => setIsMilestone(event.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-line-secondary text-accent-primary"
          />
          <Flag className="h-4 w-4" />
          同步为全站日历关键节点
        </label>
        <Button type="button" onClick={() => void handleSubmit()} disabled={disabled || saving || !title.trim()} className="gap-2 rounded-xl">
          <CalendarPlus className="h-4 w-4" />
          {saving ? '保存中' : '添加安排'}
        </Button>
      </div>
    </section>
  )
}
