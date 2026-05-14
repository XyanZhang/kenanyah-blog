import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SharedPlanSpaceClient } from '@/components/plans/SharedPlanSpaceClient'

export const metadata: Metadata = {
  title: '协作专项计划',
}

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function SharedPlanSpacePage({ params }: PageProps) {
  const { token } = await params
  if (!token) notFound()
  return <SharedPlanSpaceClient token={token} />
}
