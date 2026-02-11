'use client'

interface CursorHighlightProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function CursorHighlight({ children, className = '', style }: CursorHighlightProps) {
  return (
    <span className={`relative inline-block overflow-hidden ${className}`} style={style}>
      {children}
      <span className="pointer-events-none absolute inset-0 -z-10 animate-metallic-shine" />
    </span>
  )
}
