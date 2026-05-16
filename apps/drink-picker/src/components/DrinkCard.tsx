'use client'

import type { Recommendation } from '@/types'
import { brandLabels } from '@/data/drinks'

interface DrinkCardProps {
  recommendation: Recommendation
}

const brandColors: Record<string, string> = {
  luckin: 'border-luckin/15 bg-white/58',
  cotti: 'border-cotti/15 bg-white/58',
  starbucks: 'border-starbucks/15 bg-white/58',
}

const brandTextColors: Record<string, string> = {
  luckin: 'text-luckin',
  cotti: 'text-cotti',
  starbucks: 'text-starbucks',
}

export function DrinkCard({ recommendation }: DrinkCardProps) {
  const { drink, reason } = recommendation
  const brandColor = brandColors[drink.brand] ?? ''
  const textColor = brandTextColors[drink.brand] ?? ''

  return (
    <article className={`rounded-2xl border p-4 shadow-[0_14px_36px_oklch(0.24_0.034_35/0.065)] ${brandColor}`}>
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-champagne/45 bg-brand-porcelain text-2xl">
            {drink.emoji}
          </span>
          <div>
            <h3 className="font-serif text-xl font-semibold leading-tight text-brand-ink">{drink.name}</h3>
            <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${textColor}`}>
              {brandLabels[drink.brand]}
            </span>
          </div>
        </div>
      </div>
      <p className="whitespace-pre-line text-sm leading-6 text-brand-coffee/68">
        {reason}
      </p>
      <div className="flex gap-1.5 mt-3 flex-wrap items-center">
        <span className="rounded-full border border-brand-latte/20 bg-brand-porcelain/70 px-2 py-0.5 text-[10px] text-brand-coffee/60">
          甜 {drink.taste.sweet}
        </span>
        <span className="rounded-full border border-brand-latte/20 bg-brand-porcelain/70 px-2 py-0.5 text-[10px] text-brand-coffee/60">
          苦 {drink.taste.bitter}
        </span>
        <span className="rounded-full border border-brand-latte/20 bg-brand-porcelain/70 px-2 py-0.5 text-[10px] text-brand-coffee/60">
          清爽 {drink.taste.refreshing}
        </span>
        {drink.moodMatch.slice(0, 2).map((tag) => (
          <span key={tag} className="rounded-full border border-brand-latte/20 bg-brand-porcelain/70 px-2 py-0.5 text-[10px] text-brand-coffee/60">
            {tag}
          </span>
        ))}
      </div>
    </article>
  )
}
