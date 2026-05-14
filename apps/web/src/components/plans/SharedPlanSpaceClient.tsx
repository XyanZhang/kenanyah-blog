'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PlanItemStatus, SharedPlanSpaceDto } from '@blog/types'
import {
  createSharedPlanItem,
  deleteSharedPlanItem,
  getSharedPlanSpace,
  updateSharedPlanItem,
  type PlanItemPayload,
} from '@/lib/plan-spaces-api'
import { PlanSpaceLoading, PlanSpaceWorkbench } from './PlanSpaceWorkbench'

export function SharedPlanSpaceClient({ token }: { token: string }) {
  const [data, setData] = useState<SharedPlanSpaceDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setError(null)
    try {
      setData(await getSharedPlanSpace(token))
    } catch (err) {
      setError(err instanceof Error ? err.message : '分享链接不可用')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [token])

  const actions = useMemo(
    () => ({
      createItem: async (payload: PlanItemPayload) => {
        await createSharedPlanItem(token, payload)
        await reload()
      },
      updateItemStatus: async (itemId: string, status: PlanItemStatus) => {
        await updateSharedPlanItem(token, itemId, { status })
        await reload()
      },
      deleteItem: async (itemId: string) => {
        const confirmed = typeof window === 'undefined' ? true : window.confirm('确认删除这条安排吗？')
        if (!confirmed) return
        await deleteSharedPlanItem(token, itemId)
        await reload()
      },
    }),
    [token]
  )

  if (loading) return <PlanSpaceLoading />
  if (!data) {
    return (
      <main className="min-h-screen px-4 pt-24 sm:px-6 sm:pt-28 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-3xl rounded-lg border border-ui-destructive/20 bg-ui-destructive-light p-4 text-sm text-ui-destructive">
          {error ?? '分享链接不可用'}
        </div>
      </main>
    )
  }

  return <PlanSpaceWorkbench space={data.space} permission={data.permission} actions={actions} />
}
