'use client'

import { useEffect, useState } from 'react'
import { getCalendarInfo } from '@/data/calendar'
import type { Brand, CalendarInfo, MbtiType, MoodType } from '@/types'

interface CalendarCardProps {
  info?: CalendarInfo
  brand?: Brand | null
  mood?: MoodType | null
  mbti?: MbtiType | null
}

export function CalendarCard({ info, brand, mood, mbti }: CalendarCardProps) {
  const [clientInfo, setClientInfo] = useState<CalendarInfo | null>(info ?? null)

  useEffect(() => {
    if (!info) {
      setClientInfo(getCalendarInfo(undefined, {
        brand: brand ?? undefined,
        mood: mood ?? undefined,
        mbti: mbti ?? undefined,
      }))
    }
  }, [brand, info, mbti, mood])

  const calendarInfo = info ?? clientInfo

  if (!calendarInfo) {
    return (
      <div className="rounded-2xl border border-brand-latte/25 bg-white/45 p-4">
        <div className="h-24 animate-pulse rounded-xl bg-brand-latte/12" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-brand-latte/25 bg-white/52 p-4 shadow-[0_12px_32px_oklch(0.24_0.034_35/0.06)]">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="font-serif text-3xl font-semibold leading-none text-brand-ink">{calendarInfo.date}</p>
          <p className="mt-1 text-xs tracking-[0.16em] text-brand-coffee/52">{calendarInfo.weekday}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-brand-coffee/78">{calendarInfo.lunarMonth}{calendarInfo.lunarDate}</p>
          <p className="mt-0.5 text-xs text-brand-coffee/45">{calendarInfo.ganZhi}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-xs text-brand-coffee/50">宜</span>
          {calendarInfo.yi.map((item) => (
            <span key={item} className="rounded-full border border-brand-matcha/15 bg-white/55 px-2 py-0.5 text-xs text-brand-matcha">
              {item}
            </span>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-xs text-brand-coffee/50">忌</span>
          {calendarInfo.ji.map((item) => (
            <span key={item} className="rounded-full border border-brand-berry/15 bg-white/55 px-2 py-0.5 text-xs text-brand-berry">
              {item}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-4 text-center font-serif text-base text-brand-ink/82">
        {calendarInfo.drinkHint}
      </p>
      <p className="mt-2 text-center text-[10px] text-brand-coffee/35">
        黄历内容仅作娱乐参考
      </p>
    </div>
  )
}
