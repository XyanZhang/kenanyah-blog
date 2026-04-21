export function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)] px-6 py-12 text-center text-sm text-[var(--text-muted)]">{message}</div>
}
