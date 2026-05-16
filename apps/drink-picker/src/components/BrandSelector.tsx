'use client'

import type { Brand } from '@/types'
import { brandLabels } from '@/data/drinks'

interface BrandSelectorProps {
  selected: Brand | null
  onChange: (brand: Brand) => void
}

const brandProfiles: Array<{
  brand: Brand
  title: string
  description: string
  tone: string
}> = [
  {
    brand: 'luckin',
    title: brandLabels.luckin,
    description: '通勤、轻盈、上新速度快',
    tone: '高频日常',
  },
  {
    brand: 'cotti',
    title: brandLabels.cotti,
    description: '性价比、果咖、轻松续杯',
    tone: '随手一杯',
  },
  {
    brand: 'starbucks',
    title: brandLabels.starbucks,
    description: '经典、空间感、慢一点喝',
    tone: '稳定经典',
  },
]

export function BrandSelector({ selected, onChange }: BrandSelectorProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-center font-serif text-2xl font-semibold text-brand-ink">
        今天想喝哪一家？
      </h2>
      <div className="space-y-3">
        {brandProfiles.map((profile) => (
          <button
            key={profile.brand}
            type="button"
            onClick={() => onChange(profile.brand)}
            className={`w-full rounded-2xl border p-4 text-left transition-all active:scale-[0.99] ${
              selected === profile.brand
                ? 'border-brand-champagne bg-brand-ink text-brand-champagne shadow-[0_14px_30px_oklch(0.18_0.024_35/0.18)]'
                : 'border-white/70 bg-white/55 text-brand-ink hover:border-brand-latte/45'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-serif text-2xl font-semibold leading-none">{profile.title}</p>
                <p className={selected === profile.brand ? 'mt-2 text-sm text-brand-champagne/72' : 'mt-2 text-sm text-brand-coffee/58'}>
                  {profile.description}
                </p>
              </div>
              <span className={selected === profile.brand ? 'rounded-full border border-brand-champagne/35 px-2 py-1 text-[10px] text-brand-champagne/72' : 'rounded-full border border-brand-latte/25 px-2 py-1 text-[10px] text-brand-coffee/52'}>
                {profile.tone}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
