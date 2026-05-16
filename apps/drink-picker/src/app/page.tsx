'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrandSelector } from '@/components/BrandSelector'
import { MoodSelector } from '@/components/MoodSelector'
import { MbtiSelector } from '@/components/MbtiSelector'
import { CalendarCard } from '@/components/CalendarCard'
import type { Brand, MoodType, MbtiType } from '@/types'

export default function HomePage() {
  const router = useRouter()
  const [brand, setBrand] = useState<Brand | null>(null)
  const [mood, setMood] = useState<MoodType | null>(null)
  const [mbti, setMbti] = useState<MbtiType | null>(null)
  const [step, setStep] = useState(1)

  const handleBrandSelect = (selectedBrand: Brand) => {
    setBrand(selectedBrand)
    setStep(2)
  }

  const handleMoodSelect = (selectedMood: MoodType) => {
    setMood(selectedMood)
    setStep(3)
  }

  const handleMbtiSelect = (selectedMbti: MbtiType) => {
    setMbti(selectedMbti)
    setStep(4)
  }

  const handleRecommend = () => {
    if (!brand || !mood || !mbti) return
    const params = new URLSearchParams({ brand, mood, mbti })
    router.push(`/result?${params.toString()}`)
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:py-10">
      <div className="luxury-shell mx-auto flex w-full max-w-md flex-col rounded-[28px] border border-white/70 px-5 py-7">
      <div className="mb-8 text-center">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-brand-burgundy/70">
          Daily Coffee Ritual
        </p>
        <h1 className="font-serif text-[2.65rem] font-semibold leading-none text-brand-ink">
          今天喝什么
        </h1>
        <div className="luxury-rule mx-auto my-4 h-px w-24" />
        <p className="mx-auto max-w-[18rem] text-sm leading-6 text-brand-coffee/68">
          先选今天想喝的品牌，再为你的状态挑出一份专属杯单。
        </p>
      </div>

      <div className="mb-8 flex w-full items-center gap-2 px-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                step >= s
                  ? 'border-brand-champagne bg-brand-ink text-brand-champagne'
                  : 'border-brand-latte/30 bg-white/50 text-brand-coffee/35'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`h-px flex-1 transition-colors ${
                  step > s ? 'bg-brand-champagne' : 'bg-brand-latte/25'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="w-full space-y-6">
        {step >= 1 && (
          <div className={step === 1 ? '' : 'opacity-60 pointer-events-none'}>
            <BrandSelector selected={brand} onChange={handleBrandSelect} />
          </div>
        )}

        {step >= 2 && (
          <div className={step === 2 ? '' : 'opacity-60 pointer-events-none'}>
            <MoodSelector selected={mood} onChange={handleMoodSelect} />
          </div>
        )}

        {step >= 3 && (
          <div className={step === 3 ? '' : 'opacity-60 pointer-events-none'}>
            <MbtiSelector selected={mbti} onChange={handleMbtiSelect} />
          </div>
        )}

        {step >= 4 && (
          <div className="space-y-4">
            <CalendarCard brand={brand} mood={mood} mbti={mbti} />
            <button
              type="button"
              onClick={handleRecommend}
              disabled={!brand || !mood || !mbti}
              className="w-full rounded-2xl bg-brand-ink py-4 text-sm font-semibold tracking-[0.18em] text-brand-champagne shadow-[0_18px_40px_oklch(0.18_0.024_35/0.22)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              生成今日杯单
            </button>
          </div>
        )}
      </div>
      </div>
    </main>
  )
}
