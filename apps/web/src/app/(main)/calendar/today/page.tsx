import { redirect } from 'next/navigation'

export default function CalendarTodayPage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  redirect(`/calendar/day/${year}-${month}-${day}`)
}
