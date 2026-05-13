import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'admin-panel rounded-2xl p-4',
        className
      )}
      {...props}
    />
  )
}

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]',
        variant === 'ghost' && 'border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-muted)]',
        variant === 'danger' && 'bg-[var(--danger)] text-white hover:opacity-90',
        className
      )}
      {...props}
    />
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_var(--accent-soft)]"
      {...props}
    />
  )
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'success' | 'warning'
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-1 text-[11px] font-medium transition-[background-color,color,transform] duration-200 ease-out',
        tone === 'default' && 'bg-[var(--accent-soft)] text-[var(--accent)]',
        tone === 'success' && 'bg-[var(--success-soft)] text-[var(--success)]',
        tone === 'warning' && 'bg-[var(--warning-soft)] text-[var(--warning)]'
      )}
    >
      {children}
    </span>
  )
}
