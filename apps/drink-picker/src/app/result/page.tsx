'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DrinkCard } from '@/components/DrinkCard'
import { CalendarCard } from '@/components/CalendarCard'
import { ShareActions } from '@/components/ShareActions'
import type { Brand, MbtiType, MoodType, RecommendResult } from '@/types'

function ResultContent() {
  const searchParams = useSearchParams()
  const brand = searchParams.get('brand') as Brand | null
  const mood = searchParams.get('mood') as MoodType | null
  const mbti = searchParams.get('mbti') as MbtiType | null

  const [result, setResult] = useState<RecommendResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!brand || !mood || !mbti) {
      setError('参数缺失，请重新选择')
      setLoading(false)
      return
    }

    const fetchRecommendation = async () => {
      try {
        const res = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brand, mood, mbti }),
        })
        const data = await res.json()

        if (!data.success) {
          setError(data.error ?? '推荐失败')
          return
        }

        setResult(data.data as RecommendResult)
      } catch {
        setError('网络错误，请重试')
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendation()
  }, [brand, mood, mbti])

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="mb-4 h-12 w-12 animate-pulse rounded-full border border-brand-champagne bg-white/70" />
        <p className="text-sm tracking-[0.18em] text-brand-coffee/60">正在调制今日杯单</p>
      </main>
    )
  }

  if (error || !result) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-brand-coffee/60 mb-4">{error ?? '未知错误'}</p>
        <Link
          href="/"
          className="rounded-xl bg-brand-ink px-6 py-2 text-sm text-brand-champagne"
        >
          重新选择
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:py-10">
      <div className="luxury-shell mx-auto flex w-full max-w-md flex-col rounded-[28px] border border-white/70 px-5 py-7">
      <div className="mb-7 text-center">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-brand-burgundy/70">
          Your Daily Selection
        </p>
        <h1 className="font-serif text-4xl font-semibold leading-none text-brand-ink">专属杯单</h1>
        <div className="luxury-rule mx-auto my-4 h-px w-24" />
        <p className="text-sm leading-6 text-brand-coffee/64">
          {result.summary}
        </p>
      </div>

      <div className="w-full mb-6">
        <CalendarCard info={result.calendarInfo} />
      </div>

      <div className="w-full space-y-4 mb-6">
        {result.recommendations.map((rec) => (
          <DrinkCard key={rec.drink.id} recommendation={rec} />
        ))}
      </div>

      <div className="w-full mb-6">
        <ShareActions
          recommendations={result.recommendations}
          calendarInfo={result.calendarInfo}
          brand={result.brand}
          mood={result.mood}
          mbti={result.mbti}
        />
      </div>

      <section className="w-full mb-6 rounded-2xl border border-brand-champagne/45 bg-brand-porcelain/70 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-burgundy/60">Benefit</p>
        <p className="mt-2 text-sm font-semibold text-brand-ink">
          这里可接饮品券、公众号关注或小红书引流
        </p>
        <p className="mt-1 text-xs leading-relaxed text-brand-coffee/55">
          上线投放前替换为真实广告组件，并记录曝光、点击和分享来源。
        </p>
      </section>

      <Link
        href="/"
        className="w-full rounded-xl border border-brand-latte/35 bg-white/55 py-3 text-center text-sm font-medium text-brand-coffee"
      >
        再选一次
      </Link>
      </div>
    </main>
  )
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex flex-col items-center justify-center px-4">
          <div className="mb-4 h-12 w-12 animate-pulse rounded-full border border-brand-champagne bg-white/70" />
          <p className="text-sm tracking-[0.18em] text-brand-coffee/60">加载中</p>
        </main>
      }
    >
      <ResultContent />
    </Suspense>
  )
}
