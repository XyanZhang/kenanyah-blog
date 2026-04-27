import { useEffect, useMemo, useState } from 'react'
import type { AdminThoughtItem, PaginationMeta } from '@blog/types'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SectionTable } from '@/components/SectionTable'
import { Badge, Button, Input } from '@/components/ui'
import {
  createAdminThought,
  deleteAdminThought,
  getAdminThoughts,
  updateAdminThought,
} from '@/lib/api'

type ThoughtFormState = {
  content: string
  images: string
  likeCount: string
  commentCount: string
}

const emptyForm: ThoughtFormState = {
  content: '',
  images: '',
  likeCount: '0',
  commentCount: '0',
}

function imagesFromInput(value: string) {
  return value
    .split('\n')
    .map((image) => image.trim())
    .filter(Boolean)
}

function formFromThought(thought: AdminThoughtItem): ThoughtFormState {
  return {
    content: thought.content,
    images: thought.images.join('\n'),
    likeCount: String(thought.likeCount),
    commentCount: String(thought.commentCount),
  }
}

function numberFromInput(value: string) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : 0
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function authorLabel(thought: AdminThoughtItem) {
  if (!thought.author) return 'No author'
  return thought.author.name || thought.author.username
}

export function ThoughtsPage() {
  const [items, setItems] = useState<AdminThoughtItem[]>([])
  const [meta, setMeta] = useState<PaginationMeta | undefined>()
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<ThoughtFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const editingThought = useMemo(
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
      })
      const result = await getAdminThoughts(params)
      setItems(result.data)
      setMeta(result.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load thoughts')
    }
  }

  useEffect(() => {
    void load()
  }, [])

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

  const saveThought = async () => {
    try {
      setIsSaving(true)
      setError(null)
      const payload = {
        content: form.content.trim(),
        images: imagesFromInput(form.images),
        likeCount: numberFromInput(form.likeCount),
        commentCount: numberFromInput(form.commentCount),
      }

      if (editingId) {
        await updateAdminThought(editingId, payload)
      } else {
        await createAdminThought(payload)
      }

      resetForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save thought')
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (thought: AdminThoughtItem) => {
    setEditingId(thought.id)
    setForm(formFromThought(thought))
    setError(null)
    setIsFormOpen(true)
  }

  const removeThought = async (thought: AdminThoughtItem) => {
    if (!window.confirm('Delete this thought?')) return
    await deleteAdminThought(thought.id)
    if (editingId === thought.id) {
      resetForm()
    }
    await load()
  }

  return (
    <>
      <div className="admin-sticky space-y-3">
        <PageHeader
          eyebrow="Thoughts"
          title="Manage ideas"
          description="Create, edit, search, and remove short thought records."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => void load()}>
                Refresh
              </Button>
              <Button onClick={openCreateForm}>New thought</Button>
            </div>
          }
        />

        <div className="admin-panel grid gap-2 rounded-2xl p-3 md:grid-cols-[1fr_auto]">
          <Input placeholder="Search content" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Button onClick={() => void load()}>Apply filters</Button>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p> : null}

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="thought-form-title">
          <div className="admin-panel max-h-[calc(100vh-48px)] w-full max-w-2xl overflow-y-auto rounded-2xl p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Thought</p>
                <h2 id="thought-form-title" className="mt-1 text-lg font-semibold text-[var(--text)]">
                  {editingThought ? 'Edit thought' : 'New thought'}
                </h2>
              </div>
              <Button variant="ghost" onClick={resetForm}>
                Close
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              <textarea
                className="min-h-44 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                placeholder="Thought content"
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
              />
              <textarea
                className="min-h-24 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                placeholder="Image URLs, one per line"
                value={form.images}
                onChange={(event) => setForm({ ...form, images: event.target.value })}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input min={0} placeholder="Likes" type="number" value={form.likeCount} onChange={(event) => setForm({ ...form, likeCount: event.target.value })} />
                <Input min={0} placeholder="Comments" type="number" value={form.commentCount} onChange={(event) => setForm({ ...form, commentCount: event.target.value })} />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
              <Button disabled={isSaving} onClick={() => void saveThought()}>
                {isSaving ? 'Saving...' : editingThought ? 'Update thought' : 'Create thought'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-4">
        <SectionTable title={`Thoughts${meta ? ` · ${meta.total}` : ''}`}>
          {!items.length ? (
            <div className="p-5">
              <EmptyState message="No thoughts match the current filters." />
            </div>
          ) : (
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-[var(--bg-elevated)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Content</th>
                  <th className="px-5 py-3 font-medium">Meta</th>
                  <th className="px-5 py-3 font-medium">Updated</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((thought) => (
                  <tr key={thought.id} className="border-t border-[var(--border)]">
                    <td className="max-w-[560px] px-5 py-4 align-top">
                      <p className="line-clamp-3 whitespace-pre-wrap text-[var(--text)]">{thought.content}</p>
                      {thought.images.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {thought.images.slice(0, 4).map((image) => (
                            <img key={image} className="size-14 rounded-lg object-cover" src={image} alt="" />
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Badge>{authorLabel(thought)}</Badge>
                        <Badge tone="success">{thought.likeCount} likes</Badge>
                        <Badge tone="warning">{thought.commentCount} comments</Badge>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-[var(--text-soft)]">{formatDate(thought.updatedAt)}</td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" onClick={() => startEditing(thought)}>
                          Edit
                        </Button>
                        <Button variant="danger" onClick={() => void removeThought(thought)}>
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
