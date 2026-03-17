'use client'

import { useState, useEffect } from 'react'
import { Label, Input, Button, Switch, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { CalendarHeart, Trash2, Pencil } from 'lucide-react'
import type { CountdownCardConfig } from '@blog/types'
import {
  getCountdownEvents,
  createCountdownEvent,
  updateCountdownEvent,
  deleteCountdownEvent,
  type CountdownEventDto,
} from '@/lib/countdown-api'
import { format } from 'date-fns'

const EVENT_TYPES: { value: CountdownEventDto['type']; label: string }[] = [
  { value: 'birthday', label: '生日' },
  { value: 'anniversary', label: '纪念日' },
  { value: 'exam', label: '考试' },
  { value: 'activity', label: '活动' },
]

interface CountdownConfigFormProps {
  config: Record<string, any>
  onChange: (config: Record<string, any>) => void
}

export function CountdownConfigForm({ config, onChange }: CountdownConfigFormProps) {
  const cfg = config as CountdownCardConfig
  const [events, setEvents] = useState<CountdownEventDto[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    targetDate: format(new Date(), 'yyyy-MM-dd'),
    type: 'activity' as CountdownEventDto['type'],
  })

  const fetchEvents = () => {
    setLoading(true)
    getCountdownEvents(100)
      .then(setEvents)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleSaveConfig = (key: keyof CountdownCardConfig, value: number | boolean) => {
    onChange({ ...config, [key]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    try {
      if (editingId) {
        await updateCountdownEvent(editingId, {
          title: form.title.trim(),
          targetDate: form.targetDate,
          type: form.type,
        })
        setEditingId(null)
      } else {
        await createCountdownEvent({
          title: form.title.trim(),
          targetDate: form.targetDate,
          type: form.type,
        })
      }
      setForm({ title: '', targetDate: format(new Date(), 'yyyy-MM-dd'), type: 'activity' })
      fetchEvents()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('countdown-events-changed'))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该倒计时？')) return
    try {
      await deleteCountdownEvent(id)
      fetchEvents()
      if (editingId === id) setEditingId(null)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('countdown-events-changed'))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const startEdit = (e: CountdownEventDto) => {
    setEditingId(e.id)
    setForm({
      title: e.title,
      targetDate: e.targetDate.slice(0, 10),
      type: e.type,
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>展示条数</Label>
          <Select
            value={String(cfg.limit ?? 3)}
            onValueChange={(v) => handleSaveConfig('limit', parseInt(v, 10))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} 条
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <Label>仅显示未过期</Label>
          <Switch
            checked={cfg.futureOnly !== false}
            onCheckedChange={(checked) => handleSaveConfig('futureOnly', checked)}
          />
        </div>
      </div>

      <div className="border-t border-line-glass/50 pt-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-content-secondary">
          <CalendarHeart className="h-4 w-4" />
          管理活动
        </h4>
        {loading ? (
          <p className="text-sm text-content-muted">加载中…</p>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap items-end gap-2">
              <Input
                placeholder="活动名称"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="min-w-[120px] flex-1"
              />
              <Input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                className="w-[140px]"
              />
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as CountdownEventDto['type'] }))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" size="sm">
                {editingId ? '更新' : '添加'}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingId(null)
                    setForm({ title: '', targetDate: format(new Date(), 'yyyy-MM-dd'), type: 'activity' })
                  }}
                >
                  取消
                </Button>
              )}
            </form>
            <ul className="space-y-2 max-h-48 overflow-auto">
              {events.length === 0 ? (
                <li className="text-sm text-content-muted">暂无活动，上方添加</li>
              ) : (
                events.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line-glass/50 bg-surface-glass/30 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-content-primary">{e.title}</span>
                    <span className="shrink-0 text-content-muted">
                      {e.targetDate.slice(0, 10)} · {EVENT_TYPES.find((t) => t.value === e.type)?.label}
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(e)}
                        className="rounded p-1 text-content-muted hover:bg-surface-glass/60 hover:text-content-secondary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(e.id)}
                        className="rounded p-1 text-content-muted hover:bg-red-500/10 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
