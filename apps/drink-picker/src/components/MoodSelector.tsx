'use client'

import { moods } from '@/data/moods'
import type { MoodType } from '@/types'

interface MoodSelectorProps {
  selected: MoodType | null
  onChange: (mood: MoodType) => void
}

export function MoodSelector({ selected, onChange }: MoodSelectorProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-center font-serif text-2xl font-semibold text-brand-ink">
        你现在的心情是？
      </h2>
      <div className="grid grid-cols-4 gap-2.5">
        {moods.map((mood) => (
          <button
            key={mood.type}
            type="button"
            onClick={() => onChange(mood.type)}
            className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 transition-all active:scale-[0.98] ${
              selected === mood.type
                ? 'border-brand-champagne bg-brand-ink text-brand-champagne shadow-[0_12px_24px_oklch(0.18_0.024_35/0.18)]'
                : 'border-white/70 bg-white/55 text-brand-ink hover:border-brand-latte/45'
            }`}
          >
            <span className="text-2xl">{mood.emoji}</span>
            <span className="text-xs font-medium">{mood.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
