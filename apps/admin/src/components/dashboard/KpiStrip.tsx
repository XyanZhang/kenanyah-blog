import type { AdminDashboardKpis } from '@blog/types'

const items = [
  { key: 'totalPosts', label: 'Posts', hint: 'All content items' },
  { key: 'draftPosts', label: 'Drafts', hint: 'Need final publish' },
  { key: 'pendingComments', label: 'Pending', hint: 'Need moderation' },
  { key: 'categoryCount', label: 'Categories', hint: 'Content buckets' },
  { key: 'tagCount', label: 'Tags', hint: 'Topic labels' },
] as const satisfies Array<{
  key: keyof AdminDashboardKpis
  label: string
  hint: string
}>

export function KpiStrip({ kpis }: { kpis: AdminDashboardKpis }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-[22px] border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-strong)_90%,transparent),color-mix(in_srgb,var(--bg-elevated)_92%,transparent))] px-4 py-4"
        >
          <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">{item.label}</p>
          <p className="mt-2 text-[30px] font-semibold leading-none text-[var(--text)]">{kpis[item.key]}</p>
          <p className="mt-2 text-xs text-[var(--text-soft)]">{item.hint}</p>
        </div>
      ))}
    </div>
  )
}
