'use client'

import { useMemo, useState } from 'react'
import { mbtiProfiles } from '@/data/mbti'
import type { MbtiType } from '@/types'

interface MbtiSelectorProps {
  selected: MbtiType | null
  onChange: (mbti: MbtiType) => void
}

const DIMENSIONS = [
  { label: '能量', options: ['E', 'I'] },
  { label: '认知', options: ['S', 'N'] },
  { label: '判断', options: ['T', 'F'] },
  { label: '生活', options: ['J', 'P'] },
] as const

export function MbtiSelector({ selected, onChange }: MbtiSelectorProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-center font-serif text-2xl font-semibold text-brand-ink">
        你的 MBTI 是？
      </h2>
      <div className="grid grid-cols-4 gap-2">
        {mbtiProfiles.map((profile) => (
          <button
            key={profile.type}
            type="button"
            onClick={() => onChange(profile.type)}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 py-2 transition-all active:scale-[0.98] ${
              selected === profile.type
                ? 'border-brand-champagne bg-brand-ink text-brand-champagne shadow-[0_10px_22px_oklch(0.18_0.024_35/0.16)]'
                : 'border-white/70 bg-white/55 text-brand-ink hover:border-brand-latte/45'
            }`}
          >
            <span className="text-sm font-semibold">{profile.type}</span>
            <span className={selected === profile.type ? 'text-[10px] text-brand-champagne/75' : 'text-[10px] text-brand-coffee/58'}>
              {profile.nickname}
            </span>
          </button>
        ))}
      </div>
      {!selected && (
        <p className="mt-2 text-center text-xs text-brand-coffee/48">
          不确定类型的话，快速选四个倾向即可。
        </p>
      )}
      <QuickMbtiPicker onSelect={onChange} />
    </section>
  )
}

function QuickMbtiPicker({ onSelect }: { onSelect: (mbti: MbtiType) => void }) {
  const [choices, setChoices] = useState<Record<number, string>>({})
  const derivedMbti = useMemo(() => {
    const value = DIMENSIONS.map((_, index) => choices[index]).join('')
    return mbtiProfiles.some((profile) => profile.type === value) ? (value as MbtiType) : null
  }, [choices])

  const handleChoice = (dimensionIndex: number, option: string) => {
    const nextChoices = { ...choices, [dimensionIndex]: option }
    setChoices(nextChoices)

    const nextType = DIMENSIONS.map((_, index) => nextChoices[index]).join('')
    if (mbtiProfiles.some((profile) => profile.type === nextType)) {
      onSelect(nextType as MbtiType)
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-2xl border border-brand-latte/25 bg-brand-porcelain/55 p-3">
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-burgundy/55">Quick Type</p>
      {DIMENSIONS.map((dim, dimensionIndex) => (
        <div key={dim.label} className="flex items-center gap-2">
          <span className="w-8 text-xs text-brand-coffee/50">{dim.label}</span>
          <div className="flex gap-2 flex-1">
            {dim.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleChoice(dimensionIndex, opt)}
                className={`flex-1 rounded-lg border py-1.5 text-xs transition-colors ${
                  choices[dimensionIndex] === opt
                    ? 'border-brand-champagne bg-brand-ink text-brand-champagne'
                    : 'border-white/70 bg-white/70 text-brand-ink hover:border-brand-latte/45'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}
      {derivedMbti && (
        <p className="text-center text-xs text-brand-coffee/65">
          已选出 {derivedMbti}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          const randomIndex = Math.floor(Math.random() * mbtiProfiles.length)
          onSelect(mbtiProfiles[randomIndex].type)
        }}
        className="w-full rounded-lg border border-brand-latte/25 bg-white/60 py-2 text-xs text-brand-coffee transition-colors hover:bg-brand-champagne/18"
      >
        随机一个
      </button>
    </div>
  )
}
