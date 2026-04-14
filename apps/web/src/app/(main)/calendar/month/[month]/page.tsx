import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CalendarMonthView } from '@/components/calendar/CalendarMonthView'

export const metadata: Metadata = {
  title: '月度日历',
}

type PageProps = {
  params: Promise<{ month: string }>
}

export default async function CalendarMonthPage({ params }: PageProps) {
  const { month } = await params

  if (!/^\d{4}-\d{2}$/.test(month)) {
    notFound()
  }

  return <CalendarMonthView month={month} />
}
