'use client'

import { useRef, useCallback, useState } from 'react'
import { toPng } from 'html-to-image'
import type { Recommendation, CalendarInfo, MoodType, MbtiType, Brand } from '@/types'
import { brandLabels } from '@/data/drinks'
import { ShareCard } from './ShareCard'

interface ShareActionsProps {
  recommendations: Recommendation[]
  calendarInfo: CalendarInfo
  brand: Brand
  mood: MoodType
  mbti: MbtiType
}

export function ShareActions({ recommendations, calendarInfo, brand, mood, mbti }: ShareActionsProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const handleSaveImage = useCallback(async () => {
    if (!cardRef.current) return
    setSaving(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#F5F0EB',
      })
      const link = document.createElement('a')
      link.download = `今天喝什么_${new Date().toLocaleDateString('zh-CN')}.png`
      link.href = dataUrl
      link.click()
      setStatus('图片已生成，可以发小红书或朋友圈')
    } catch {
      setStatus('图片生成失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }, [])

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setStatus('链接已复制')
    } catch {
      setStatus('复制失败，请手动复制地址栏链接')
    }
  }, [])

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) {
      await handleCopyLink()
      return
    }

    try {
      await navigator.share({
        title: '今天喝什么？',
        text: `我的 ${mbti} 今日${brandLabels[brand]}推荐出炉了：${recommendations[0]?.drink.name ?? '专属杯单'}`,
        url: window.location.href,
      })
      setStatus('分享面板已打开')
    } catch {
      setStatus('分享取消')
    }
  }, [brand, handleCopyLink, mbti, recommendations])

  return (
    <div className="space-y-4">
      {/* Hidden card for image generation */}
      <div className="fixed left-[-9999px] top-0">
        <ShareCard
          ref={cardRef}
          recommendations={recommendations}
          calendarInfo={calendarInfo}
          brand={brand}
          mood={mood}
          mbti={mbti}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleSaveImage}
          disabled={saving}
          className="rounded-xl bg-brand-ink py-3 text-sm font-medium text-brand-champagne transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? '生成中' : '存图'}
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          className="rounded-xl border border-brand-latte/30 bg-white/55 py-3 text-sm font-medium text-brand-coffee transition-transform active:scale-[0.98]"
        >
          复制链接
        </button>
        <button
          type="button"
          onClick={handleNativeShare}
          className="rounded-xl border border-brand-latte/30 bg-white/55 py-3 text-sm font-medium text-brand-coffee transition-transform active:scale-[0.98]"
        >
          分享
        </button>
      </div>
      {status && (
        <p className="text-xs text-center text-brand-coffee/55">{status}</p>
      )}
    </div>
  )
}
