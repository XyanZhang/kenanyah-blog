import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TocHeading } from '@/lib/heading'

export interface PostAsideProps {
  headings: TocHeading[]
}

function useReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement
      const scrollTop = window.scrollY || doc.scrollTop
      const scrollHeight = doc.scrollHeight - doc.clientHeight
      const next = scrollHeight > 0 ? Math.min(1, Math.max(0, scrollTop / scrollHeight)) : 0
      setProgress(next)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return progress
}

function useCompletionConfetti(progress: number) {
  const firedRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (firedRef.current) return
    if (progress < 1) return

    const key = `easterEgg:confetti:${window.location.pathname}`
    if (sessionStorage.getItem(key) === '1') {
      firedRef.current = true
      return
    }

    timerRef.current = window.setTimeout(async () => {
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
      if (reduceMotion) {
        sessionStorage.setItem(key, '1')
        firedRef.current = true
        return
      }

      const { default: confetti } = await import('canvas-confetti')

      const burst = (particleCount: number, spread: number, originX: number) =>
        confetti({
          particleCount,
          spread,
          startVelocity: 45,
          gravity: 1.15,
          ticks: 220,
          scalar: 0.95,
          origin: { x: originX, y: 0.78 },
          zIndex: 9999,
        })

      burst(120, 70, 0.25)
      burst(120, 70, 0.75)

      sessionStorage.setItem(key, '1')
      firedRef.current = true
    }, 1000)

    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [progress])
}

export function PostAside({ headings }: PostAsideProps) {
  const progress = useReadingProgress()
  const progressPct = Math.round(progress * 100)
  const items = useMemo(() => headings.slice(0, 18), [headings])

  useCompletionConfetti(progress)

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navigateToHeading = (id: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    const target = document.getElementById(id)
    if (!target) return
    const offset = 110
    const y = target.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
    window.history.replaceState(null, '', `#${id}`)
  }

  const ringSize = 36
  const stroke = 3
  const radius = (ringSize - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-line-glass bg-surface-glass/45 backdrop-blur-sm p-3 shadow-sm">
        {items.length > 0 ? (
          <div>
            <div className="text-xs font-medium text-content-secondary">目录</div>
            <nav className="mt-2 space-y-1">
              {items.map((h) => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  onClick={navigateToHeading(h.id)}
                  className={cn(
                    'block rounded-md px-2 py-1 text-xs leading-relaxed text-content-tertiary hover:text-accent-primary hover:bg-surface-glass/60 transition-colors',
                    h.depth === 3 ? 'pl-4' : ''
                  )}
                >
                  {h.text}
                </a>
              ))}
            </nav>
            {headings.length > items.length ? (
              <div className="mt-2 text-[11px] text-content-dim">仅展示前 {items.length} 项</div>
            ) : null}
          </div>
        ) : (
          <div className="text-xs text-content-dim">本文暂无目录</div>
        )}
      </div>

      {/* 进度环 + 回到顶部：与目录左侧对齐 */}
      <div className="mt-3 flex flex-col items-start gap-2">
        <div className="relative" style={{ width: ringSize, height: ringSize }}>
          <svg
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
            className="-rotate-90"
            aria-hidden
          >
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="var(--theme-border-primary)"
              strokeWidth={stroke}
              opacity={0.55}
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="var(--theme-accent-primary)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums text-content-primary">
            {progressPct}%
          </div>
        </div>

        <button
          type="button"
          onClick={scrollToTop}
          className="inline-flex items-center justify-center rounded-full border border-line-primary/60 bg-transparent text-content-primary hover:bg-surface-glass/35 transition-colors"
          style={{ width: ringSize, height: ringSize }}
          aria-label="回到顶部"
          title="回到顶部"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

