import { useEffect, useMemo, useState } from 'react'
import type { AdminMediaItem } from '@blog/types'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SectionTable } from '@/components/SectionTable'
import { Button, Input } from '@/components/ui'
import { getAdminMedia, uploadAdminMedia } from '@/lib/api'

const mediaTypeOptions = [
  { value: 'all', label: 'All types' },
  { value: 'image', label: 'Images' },
  { value: 'pdf', label: 'PDFs' },
  { value: 'other', label: 'Other' },
] as const

const sourceOptions = [
  { value: 'all', label: 'All sources' },
  { value: 'admin', label: 'Admin' },
  { value: 'pdf_agent', label: 'PDF Agent' },
  { value: 'pictures', label: 'Pictures' },
] as const

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'ready', label: 'Ready' },
  { value: 'missing', label: 'Missing' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
] as const

function resolveMediaUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  const path = url.startsWith('/') ? url : `/${url}`
  return `${window.location.origin}${path}`
}

export function MediaPage() {
  const [items, setItems] = useState<AdminMediaItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<(typeof mediaTypeOptions)[number]['value']>('all')
  const [source, setSource] = useState('all')
  const [status, setStatus] = useState('all')
  const [subdir, setSubdir] = useState('all')

  const load = async () => {
    try {
      setError(null)
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (type !== 'all') params.set('type', type)
      if (source !== 'all') params.set('source', source)
      if (status !== 'all') params.set('status', status)
      if (subdir !== 'all') params.set('subdir', subdir)
      const result = await getAdminMedia(params)
      setItems(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media')
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 200)
    return () => window.clearTimeout(timer)
  }, [search, type, source, status, subdir])

  const folderOptions = useMemo(() => {
    const names = new Set(items.map((item) => item.subdir).filter(Boolean))
    return ['all', ...Array.from(names).sort()]
  }, [items])

  const resetFilters = () => {
    setSearch('')
    setType('all')
    setSource('all')
    setStatus('all')
    setSubdir('all')
  }

  return (
    <>
      <div className="admin-sticky space-y-3">
        <PageHeader
          eyebrow="Media"
          title="Browse and upload assets"
          description="See images and PDF files uploaded from admin tools and the PDF Agent."
          actions={
            <label className="inline-flex cursor-pointer rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white">
              {uploading ? 'Uploading...' : 'Upload asset'}
              <input
                className="hidden"
                type="file"
                accept="image/*,application/pdf"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  setUploading(true)
                  try {
                    await uploadAdminMedia(file)
                    await load()
                  } finally {
                    setUploading(false)
                  }
                }}
              />
            </label>
          }
        />

        <div className="admin-panel grid gap-2 rounded-2xl p-3 lg:grid-cols-[minmax(16rem,1.4fr)_repeat(4,minmax(9rem,1fr))_auto]">
          <Input
            placeholder="Search filename, folder, type, source..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          >
            {mediaTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={subdir}
            onChange={(event) => setSubdir(event.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          >
            {folderOptions.map((folder) => (
              <option key={folder} value={folder}>{folder === 'all' ? 'All folders' : folder}</option>
            ))}
          </select>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <Button variant="ghost" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p> : null}

      <SectionTable title={`Media library · ${items.length}`}>
        {!items.length ? (
          <div className="p-5">
            <EmptyState message="No uploaded files yet." />
          </div>
        ) : (
          <table className="admin-table min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-elevated)]">
              <tr>
                <th className="px-5 py-3 font-medium">File</th>
                <th className="px-5 py-3 font-medium">Folder</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Updated</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-[var(--border)]">
                  <td className="px-5 py-4 text-[var(--text)]">
                    <p>{item.name}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{Math.ceil(item.size / 1024)} KB</p>
                  </td>
                  <td className="px-5 py-4 text-[var(--text-soft)]">{item.subdir}</td>
                  <td className="px-5 py-4 text-[var(--text-soft)]">{item.category ?? 'other'}</td>
                  <td className="px-5 py-4 text-[var(--text-soft)]">{item.mimeType}</td>
                  <td className="px-5 py-4 text-[var(--text-soft)]">
                    <div>{item.source ?? 'filesystem'}</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{item.status ?? 'ready'}</div>
                  </td>
                  <td className="px-5 py-4 text-[var(--text-soft)]">{new Date(item.updatedAt).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    {item.status === 'missing' ? (
                      <span className="text-xs text-[var(--text-muted)]">File missing</span>
                    ) : (
                      <Button variant="ghost" onClick={() => window.open(resolveMediaUrl(item.url), '_blank', 'noopener,noreferrer')}>
                        Open
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionTable>
    </>
  )
}
