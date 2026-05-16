'use client'

import { forwardRef } from 'react'
import type { Recommendation, CalendarInfo, MoodType, MbtiType, Brand } from '@/types'
import { brandLabels } from '@/data/drinks'
import { getCalendarInfo } from '@/data/calendar'

interface ShareCardProps {
  recommendations: Recommendation[]
  calendarInfo?: CalendarInfo
  brand: Brand
  mood: MoodType
  mbti: MbtiType
}

const moodLabels: Record<string, { label: string; emoji: string }> = {
  happy: { label: '开心', emoji: '😄' },
  sad: { label: '低落', emoji: '😔' },
  angry: { label: '烦躁', emoji: '😤' },
  tired: { label: '疲惫', emoji: '🥱' },
  excited: { label: '兴奋', emoji: '🎉' },
  calm: { label: '平静', emoji: '😌' },
  romantic: { label: '恋爱', emoji: '💕' },
  energetic: { label: '充电', emoji: '💪' },
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ recommendations, calendarInfo: calendarInfoProp, brand, mood, mbti }, ref) => {
    const calendarInfo = calendarInfoProp ?? getCalendarInfo(undefined, { brand, mood, mbti })
    const moodInfo = moodLabels[mood]

    return (
      <div
        ref={ref}
        className="w-[375px] bg-gradient-to-br from-brand-cream via-white to-brand-cream p-6 rounded-3xl"
        style={{ fontFamily: "'PingFang SC', sans-serif" }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-brand-mocha">今天喝什么？</h1>
          <p className="text-sm text-brand-coffee/60 mt-1">
            {brandLabels[brand]} · {moodInfo?.emoji} {moodInfo?.label}的{mbti}
          </p>
        </div>

        {/* Calendar */}
        <div className="bg-white/60 rounded-xl p-3 mb-4 text-center">
          <p className="text-xs text-brand-coffee/50">
            {calendarInfo.lunarMonth}{calendarInfo.lunarDate} · {calendarInfo.ganZhi}
          </p>
          <p className="text-sm text-brand-coffee/70 mt-1">{calendarInfo.drinkHint}</p>
        </div>

        {/* Drinks */}
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.drink.id}
              className="flex items-center gap-3 bg-white/80 rounded-xl p-3"
            >
              <span className="text-2xl">{rec.drink.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-brand-mocha">{rec.drink.name}</p>
                <p className="text-xs text-brand-coffee/50">{brandLabels[rec.drink.brand]}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-xs text-brand-coffee/40">长按保存 · 分享给朋友</p>
          <p className="text-xs text-brand-coffee/30 mt-1">今天喝什么 · AI帮你选饮品</p>
        </div>
      </div>
    )
  },
)

ShareCard.displayName = 'ShareCard'
