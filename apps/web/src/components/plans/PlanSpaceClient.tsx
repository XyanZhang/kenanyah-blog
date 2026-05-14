'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PlanItemStatus, PlanSpaceDto } from '@blog/types'
import {
  createPlanItem,
  deletePlanItem,
  getPlanSpace,
  updatePlanItem,
  type PlanItemPayload,
} from '@/lib/plan-spaces-api'
import { PlanSpaceLoading, PlanSpaceWorkbench } from './PlanSpaceWorkbench'

export function PlanSpaceClient({ id }: { id: string }) {
  const [space, setSpace] = useState<PlanSpaceDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setError(null)
    try {
      setSpace(await getPlanSpace(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载专项计划失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [id])

  const actions = useMemo(
    () => ({
      createItem: async (payload: PlanItemPayload) => {
        await createPlanItem(id, payload)
        await reload()
      },
      updateItemStatus: async (itemId: string, status: PlanItemStatus) => {
        await updatePlanItem(id, itemId, { status })
        await reload()
      },
      deleteItem: async (itemId: string) => {
        const confirmed = typeof window === 'undefined' ? true : window.confirm('确认删除这条安排吗？')
        if (!confirmed) return
        await deletePlanItem(id, itemId)
        await reload()
      },
    }),
    [id]
  )

  if (loading) return <PlanSpaceLoading />
  if (!space) {
    return (
      <main className="min-h-screen px-4 pt-24 sm:px-6 sm:pt-28 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-3xl rounded-lg border border-ui-destructive/20 bg-ui-destructive-light p-4 text-sm text-ui-destructive">
          {error ?? '专项计划不存在'}
        </div>
      </main>
    )
  }

  return <PlanSpaceWorkbench space={space} actions={actions} />
}
