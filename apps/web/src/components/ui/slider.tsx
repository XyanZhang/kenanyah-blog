'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SliderProps {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  disabled?: boolean
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  disabled = false,
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className={cn('relative flex w-full touch-none select-none items-center', className)}>
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-surface-tertiary">
        <div
          className="absolute h-full bg-ui-primary-ring"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="absolute h-full w-full cursor-pointer opacity-0"
      />
      <div
        className="absolute h-5 w-5 rounded-full border-2 border-line-focus bg-surface-primary shadow"
        style={{ left: `calc(${percentage}% - 10px)` }}
      />
    </div>
  )
}
