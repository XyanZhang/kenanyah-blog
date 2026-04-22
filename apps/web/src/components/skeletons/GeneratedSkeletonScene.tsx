import type { CSSProperties } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type GeneratedSkeletonKind = 'line' | 'block' | 'circle' | 'surface'

export interface GeneratedSkeletonShape {
  id: string
  kind: GeneratedSkeletonKind
  x: number
  y: number
  width: number
  height: number
  radius: number
  opacity?: number
}

export interface GeneratedSkeletonFrame {
  tag?: 'main' | 'section' | 'div'
  width: number
  height: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  centered?: boolean
}

interface GeneratedSkeletonSceneProps {
  frame: GeneratedSkeletonFrame
  shapes: GeneratedSkeletonShape[]
  className?: string
}

function buildShapeStyle(shape: GeneratedSkeletonShape): CSSProperties {
  return {
    left: `${shape.x}%`,
    top: `${shape.y}%`,
    width: `${shape.width}%`,
    height: `${shape.height}%`,
    borderRadius: shape.kind === 'circle' ? 9999 : `${shape.radius}px`,
    opacity: shape.opacity ?? 1,
  }
}

export function GeneratedSkeletonScene({
  frame,
  shapes,
  className,
}: GeneratedSkeletonSceneProps) {
  const wrapperStyle: CSSProperties = {
    paddingTop: frame.paddingTop ?? 0,
    paddingRight: frame.paddingRight ?? 0,
    paddingBottom: frame.paddingBottom ?? 0,
    paddingLeft: frame.paddingLeft ?? 0,
  }

  const content = (
    <div
      className={cn('relative w-full', frame.centered ? 'mx-auto' : '')}
      style={{
        maxWidth: `${frame.width}px`,
        minHeight: `${frame.height}px`,
      }}
    >
      {shapes.map((shape) => (
        <Skeleton
          key={shape.id}
          className={cn(
            'absolute',
            shape.kind === 'line' && 'rounded-full',
            shape.kind === 'surface' && 'bg-surface-glass/35'
          )}
          style={buildShapeStyle(shape)}
        />
      ))}
    </div>
  )

  if (frame.tag === 'section') {
    return (
      <section className={cn('w-full', className)} style={wrapperStyle} aria-busy="true">
        {content}
      </section>
    )
  }

  if (frame.tag === 'div') {
    return (
      <div className={cn('w-full', className)} style={wrapperStyle} aria-busy="true">
        {content}
      </div>
    )
  }

  return (
    <main className={cn('w-full', className)} style={wrapperStyle} aria-busy="true">
      {content}
    </main>
  )
}
