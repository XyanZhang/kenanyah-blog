import { useEffect, useMemo, useState } from 'react'
import type { PaginationMeta, PhotoEntryDto } from '@blog/types'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SectionTable } from '@/components/SectionTable'
import { Badge, Button, Input } from '@/components/ui'
import {
  createAdminPhoto,
  deleteAdminPhoto,
  getAdminPhotos,
  uploadAdminMedia,
  updateAdminPhoto,
} from '@/lib/api'

type ImageFilter = 'all' | 'true' | 'false'

type PhotoFormState = {
  title: string
  description: string
  imageUrl: string
  mediaAssetId: string
  date: string
}

const emptyForm: PhotoFormState = {
  title: '',
  description: '',
  imageUrl: '',
  mediaAssetId: '',
  date: '',
}

function dateFromIso(value: string | null) {
  return value ? value.slice(0, 10) : ''
}

function formFromPhoto(photo: PhotoEntryDto): PhotoFormState {
  return {
    title: photo.title ?? '',
    description: photo.description ?? '',
    imageUrl: photo.imageUrl ?? '',
    mediaAssetId: photo.mediaAssetId ?? '',
    date: dateFromIso(photo.takenAt),
  }
}

function formatDate(value: string | null) {
  if (!value) return 'No date'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function displayTitle(photo: PhotoEntryDto) {
  return photo.title?.trim() || 'Untitled photo'
}

export function PhotosPage() {
  const [items, setItems] = useState<PhotoEntryDto[]>([])
  const [meta, setMeta] = useState<PaginationMeta | undefined>()
  const [search, setSearch] = useState('')
  const [hasImage, setHasImage] = useState<ImageFilter>('all')
  const [form, setForm] = useState<PhotoFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const editingPhoto = useMemo(
    () => items.find((item) => item.id === editingId),
    [editingId, items]
  )

  const load = async () => {
    try {
      setError(null)
      const params = new URLSearchParams({
        page: '1',
        limit: '20',
        search,
        hasImage,
      })
      const result = await getAdminPhotos(params)
      setItems(result.data)
      setMeta(result.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photos')
    }
  }

  useEffect(() => {
    void load()
  }, [hasImage])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setIsFormOpen(false)
  }

  const openCreateForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setError(null)
    setIsFormOpen(true)
  }

  const savePhoto = async () => {
    try {
      setIsSaving(true)
      setError(null)
      const payload = {
        title: form.title.trim() || null,
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        mediaAssetId: form.mediaAssetId || null,
        date: form.date || null,
      }

      if (editingId) {
        await updateAdminPhoto(editingId, payload)
      } else {
        await createAdminPhoto(payload)
      }

      resetForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save photo')
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (photo: PhotoEntryDto) => {
    setEditingId(photo.id)
    setForm(formFromPhoto(photo))
    setError(null)
    setIsFormOpen(true)
  }

  const uploadImage = async (file: File) => {
    try {
      setIsUploading(true)
      setError(null)
      const result = await uploadAdminMedia(file)
      setForm((current) => ({
        ...current,
        imageUrl: result.data.url,
        mediaAssetId: result.data.id,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const removePhoto = async (photo: PhotoEntryDto) => {
    if (!window.confirm(`Delete "${displayTitle(photo)}"?`)) return
    await deleteAdminPhoto(photo.id)
    if (editingId === photo.id) {
      resetForm()
    }
    await load()
  }

  return (
    <>
      <div className="admin-sticky space-y-3">
        <PageHeader
          eyebrow="Photos"
          title="Manage photo entries"
          description="Create, update, and curate the photo records used by the public picture wall and calendar."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => void load()}>
                Refresh
              </Button>
              <Button onClick={openCreateForm}>New photo</Button>
            </div>
          }
        />

        <div className="admin-panel grid gap-2 rounded-2xl p-3 md:grid-cols-[1fr_180px_140px]">
          <Input placeholder="Search title, description, image URL" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none" value={hasImage} onChange={(event) => setHasImage(event.target.value as ImageFilter)}>
            <option value="all">All photos</option>
            <option value="true">With image</option>
            <option value="false">Missing image</option>
          </select>
          <Button onClick={() => void load()}>Apply filters</Button>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p> : null}

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="photo-form-title">
          <div className="admin-panel max-h-[calc(100vh-48px)] w-full max-w-2xl overflow-y-auto rounded-2xl p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Photo</p>
                <h2 id="photo-form-title" className="mt-1 text-lg font-semibold text-[var(--text)]">
                  {editingPhoto ? 'Edit photo' : 'New photo'}
                </h2>
              </div>
              <Button variant="ghost" onClick={resetForm}>
                Close
              </Button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[160px_1fr]">
              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
                {form.imageUrl ? (
                  <img className="aspect-square h-full w-full object-cover" src={form.imageUrl} alt="" />
                ) : (
                  <div className="grid aspect-square place-items-center px-4 text-center text-xs text-[var(--text-muted)]">
                    Image preview
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <Input placeholder="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                <div className="grid gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                  <Input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={isUploading} onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void uploadImage(file)
                    event.target.value = ''
                  }} />
                  <p className="text-xs text-[var(--text-muted)]">
                    {isUploading ? 'Uploading image...' : form.mediaAssetId ? 'Image is stored in Media Library.' : 'Upload stores the image and fills the URL automatically.'}
                  </p>
                </div>
                <Input placeholder="Image URL" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value, mediaAssetId: '' })} />
                <Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
                <textarea
                  className="min-h-28 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                  placeholder="Description"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
              <Button disabled={isSaving} onClick={() => void savePhoto()}>
                {isSaving ? 'Saving...' : editingPhoto ? 'Update photo' : 'Create photo'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-4">
        <SectionTable title={`Photos${meta ? ` · ${meta.total}` : ''}`}>
          {!items.length ? (
            <div className="p-5">
              <EmptyState message="No photos match the current filters." />
            </div>
          ) : (
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-[var(--bg-elevated)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Photo</th>
                  <th className="px-5 py-3 font-medium">Image</th>
                  <th className="px-5 py-3 font-medium">Taken</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((photo) => (
                  <tr key={photo.id} className="border-t border-[var(--border)]">
                    <td className="max-w-[520px] px-5 py-4 align-top">
                      <p className="font-medium text-[var(--text)]">{displayTitle(photo)}</p>
                      {photo.description ? <p className="mt-2 line-clamp-2 text-sm text-[var(--text-soft)]">{photo.description}</p> : null}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-3">
                        {photo.imageUrl ? (
                          <img className="h-14 w-14 rounded-xl object-cover" src={photo.imageUrl} alt="" />
                        ) : (
                          <div className="grid h-14 w-14 place-items-center rounded-xl bg-[var(--bg-elevated)] text-[10px] text-[var(--text-muted)]">
                            Empty
                          </div>
                        )}
                        <div className="min-w-0">
                          <Badge tone={photo.imageUrl ? 'success' : 'warning'}>{photo.imageUrl ? 'Ready' : 'Missing image'}</Badge>
                          {photo.imageUrl ? <p className="mt-1 max-w-[320px] truncate text-xs text-[var(--text-muted)]">{photo.imageUrl}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-[var(--text-soft)]">{formatDate(photo.takenAt)}</td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" onClick={() => startEditing(photo)}>
                          Edit
                        </Button>
                        {photo.imageUrl ? (
                          <Button variant="ghost" onClick={() => window.open(photo.imageUrl!, '_blank', 'noopener,noreferrer')}>
                            Open
                          </Button>
                        ) : null}
                        <Button variant="danger" onClick={() => void removePhoto(photo)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionTable>
      </div>
    </>
  )
}
