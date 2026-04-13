import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CalendarDayView } from '@/components/calendar/CalendarDayView'

export const metadata: Metadata = {
  title: '当日事件',
}

type PageProps = {
  params: Promise<{ date: string }>
}

export default async function CalendarDayPage({ params }: PageProps) {
  const { date } = await params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound()
  }

  return <CalendarDayView date={date} />
}
