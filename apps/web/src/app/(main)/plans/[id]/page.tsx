import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PlanSpaceClient } from '@/components/plans/PlanSpaceClient'

export const metadata: Metadata = {
  title: '专项计划',
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PlanSpacePage({ params }: PageProps) {
  const { id } = await params
  if (!id) notFound()
  return <PlanSpaceClient id={id} />
}
