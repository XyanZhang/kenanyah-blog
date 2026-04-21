import { useEffect, useState } from 'react'
import type { AdminMediaItem } from '@blog/types'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SectionTable } from '@/components/SectionTable'
import { Button } from '@/components/ui'
import { SITE_BASE_URL, getAdminMedia, uploadAdminMedia } from '@/lib/api'

export function MediaPage() {
  const [items, setItems] = useState<AdminMediaItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    try {
      setError(null)
      const result = await getAdminMedia()
      setItems(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <>
      <div className="admin-sticky">
        <PageHeader
          eyebrow="Media"
          title="Browse and upload assets"
          description="See the current uploaded assets and add more images for editorial use."
          actions={
            <label className="inline-flex cursor-pointer rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white">
              {uploading ? 'Uploading...' : 'Upload image'}
              <input
                className="hidden"
                type="file"
                accept="image/*"
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
                <th className="px-5 py-3 font-medium">Type</th>
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
                  <td className="px-5 py-4 text-[var(--text-soft)]">{item.mimeType}</td>
                  <td className="px-5 py-4 text-[var(--text-soft)]">{new Date(item.updatedAt).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <Button variant="ghost" onClick={() => window.open(`${SITE_BASE_URL}${item.url}`, '_blank')}>
                      Open
                    </Button>
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
