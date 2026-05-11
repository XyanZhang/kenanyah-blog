import { useEffect, useMemo, useState } from 'react'
import type { AdminDraftIdeaItem, DraftIdeaPreviewResult, DraftIdeaSourceType, DraftIdeaStatus, PaginationMeta } from '@blog/types'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SectionTable } from '@/components/SectionTable'
import { Badge, Button, Input } from '@/components/ui'
import {
  convertAdminDraftIdeaToPost,
  createAdminDraftIdea,
  deleteAdminDraftIdea,
  getAdminDraftIdeas,
  previewAdminDraftIdeaPost,
  updateAdminDraftIdea,
} from '@/lib/api'

type DraftIdeaFormState = {
  title: string
  summary: string
  angle: string
  notes: string
  status: DraftIdeaStatus
  sourceType: DraftIdeaSourceType
  sourceId: string
  sourceUrl: string
  tags: string
  priority: string
}

const statusOptions: Array<{ value: DraftIdeaStatus; label: string }> = [
  { value: 'idea', label: 'Idea' },
  { value: 'outlining', label: 'Outlining' },
  { value: 'writing', label: 'Writing' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

const sourceOptions: Array<{ value: DraftIdeaSourceType; label: string }> = [
  { value: 'manual', label: 'Manual' },
  { value: 'thought', label: 'Essay' },
  { value: 'bookmark', label: 'Bookmark' },
  { value: 'pdf', label: 'PDF' },
  { value: 'chat', label: 'Chat' },
]

const emptyForm: DraftIdeaFormState = {
  title: '',
  summary: '',
  angle: '',
  notes: '',
  status: 'idea',
  sourceType: 'manual',
  sourceId: '',
  sourceUrl: '',
  tags: '',
  priority: '2',
}

function tagsFromInput(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function priorityFromInput(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 2
  return Math.min(3, Math.max(1, Math.trunc(parsed)))
}

function nullable(value: string) {
  const trimmed = value.trim()
  return trimmed || null
}

function formFromIdea(idea: AdminDraftIdeaItem): DraftIdeaFormState {
  return {
    title: idea.title,
    summary: idea.summary ?? '',
    angle: idea.angle ?? '',
    notes: idea.notes ?? '',
    status: idea.status,
    sourceType: idea.sourceType,
    sourceId: idea.sourceId ?? '',
    sourceUrl: idea.sourceUrl ?? '',
    tags: idea.tags.join(', '),
    priority: String(idea.priority),
  }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function statusTone(status: DraftIdeaStatus): 'default' | 'success' | 'warning' {
  if (status === 'published') return 'success'
  if (status === 'writing' || status === 'outlining') return 'warning'
  return 'default'
}

export function DraftIdeasPage() {
  const [items, setItems] = useState<AdminDraftIdeaItem[]>([])
  const [meta, setMeta] = useState<PaginationMeta | undefined>()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<DraftIdeaStatus | 'all'>('all')
  const [sourceType, setSourceType] = useState<DraftIdeaSourceType | 'all'>('all')
  const [form, setForm] = useState<DraftIdeaFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [preview, setPreview] = useState<DraftIdeaPreviewResult | null>(null)
  const [previewIdea, setPreviewIdea] = useState<AdminDraftIdeaItem | null>(null)

  const editingIdea = useMemo(() => items.find((item) => item.id === editingId), [editingId, items])

  const load = async () => {
    try {
      setError(null)
      const params = new URLSearchParams({
        page: '1',
        limit: '30',
        search,
        status,
        sourceType,
      })
      const result = await getAdminDraftIdeas(params)
      setItems(result.data)
      setMeta(result.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load draft ideas')
    }
  }

  useEffect(() => {
    void load()
  }, [status, sourceType])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setIsFormOpen(false)
  }

  const openCreateForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setError(null)
    setNotice(null)
    setIsFormOpen(true)
  }

  const startEditing = (idea: AdminDraftIdeaItem) => {
    setForm(formFromIdea(idea))
    setEditingId(idea.id)
    setError(null)
    setNotice(null)
    setIsFormOpen(true)
  }

  const saveIdea = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setNotice(null)
      const payload = {
        title: form.title.trim(),
        summary: nullable(form.summary),
        angle: nullable(form.angle),
        notes: nullable(form.notes),
        status: form.status,
        sourceType: form.sourceType,
        sourceId: nullable(form.sourceId),
        sourceUrl: nullable(form.sourceUrl),
        tags: tagsFromInput(form.tags),
        priority: priorityFromInput(form.priority),
      }

      if (editingId) {
        await updateAdminDraftIdea(editingId, payload)
      } else {
        await createAdminDraftIdea(payload)
      }

      resetForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft idea')
    } finally {
      setIsSaving(false)
    }
  }

  const previewDraft = async (idea: AdminDraftIdeaItem) => {
    try {
      setBusyId(idea.id)
      setError(null)
      setNotice(null)
      const result = await previewAdminDraftIdeaPost(idea.id)
      setPreview(result.data)
      setPreviewIdea(idea)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview draft post')
    } finally {
      setBusyId(null)
    }
  }

  const closePreview = () => {
    setPreview(null)
    setPreviewIdea(null)
  }

  const confirmCreatePost = async () => {
    if (!previewIdea) return
    try {
      setBusyId(previewIdea.id)
      setError(null)
      setNotice(null)
      const result = await convertAdminDraftIdeaToPost(previewIdea.id, { content: preview?.content })
      setNotice(`Generated article draft ${result.data.slug}`)
      closePreview()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create draft post')
    } finally {
      setBusyId(null)
    }
  }

  const removeIdea = async (idea: AdminDraftIdeaItem) => {
    if (!window.confirm(`Delete "${idea.title}"?`)) return
    await deleteAdminDraftIdea(idea.id)
    if (editingId === idea.id) resetForm()
    await load()
  }

  return (
    <>
      <div className="admin-sticky space-y-3">
        <PageHeader
          eyebrow="Draft Idea Inbox"
          title="Shape raw ideas into posts"
          description="Collect writing candidates, refine angles, and move ready ideas into draft posts."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => void load()}>
                Refresh
              </Button>
              <Button onClick={openCreateForm}>New idea</Button>
            </div>
          }
        />

        <div className="admin-panel grid gap-2 rounded-2xl p-3 md:grid-cols-[1fr_160px_160px_auto]">
          <Input placeholder="Search title, angle, notes" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none" value={status} onChange={(event) => setStatus(event.target.value as DraftIdeaStatus | 'all')}>
            <option value="all">All statuses</option>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none" value={sourceType} onChange={(event) => setSourceType(event.target.value as DraftIdeaSourceType | 'all')}>
            <option value="all">All sources</option>
            {sourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <Button onClick={() => void load()}>Apply filters</Button>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p> : null}
      {notice ? <p className="mb-4 rounded-xl border border-[var(--success)]/20 bg-[var(--success-soft)] px-3 py-2 text-sm text-[var(--success)]">{notice}</p> : null}

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="draft-idea-form-title">
          <div className="admin-panel max-h-[calc(100vh-48px)] w-full max-w-3xl overflow-y-auto rounded-2xl p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Idea</p>
                <h2 id="draft-idea-form-title" className="mt-1 text-lg font-semibold text-[var(--text)]">
                  {editingIdea ? 'Edit draft idea' : 'New draft idea'}
                </h2>
              </div>
              <Button variant="ghost" onClick={resetForm}>Close</Button>
            </div>

            <div className="mt-5 grid gap-3">
              <Input placeholder="Working title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              <textarea className="min-h-24 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]" placeholder="Summary" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
              <textarea className="min-h-24 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]" placeholder="Writing angle" value={form.angle} onChange={(event) => setForm({ ...form, angle: event.target.value })} />
              <textarea className="min-h-32 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]" placeholder="Notes, outline fragments, questions" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              <div className="grid gap-3 md:grid-cols-4">
                <select className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as DraftIdeaStatus })}>
                  {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none" value={form.sourceType} onChange={(event) => setForm({ ...form, sourceType: event.target.value as DraftIdeaSourceType })}>
                  {sourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <Input placeholder="Priority 1-3" type="number" min={1} max={3} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} />
                <Input placeholder="Source id" value={form.sourceId} onChange={(event) => setForm({ ...form, sourceId: event.target.value })} />
              </div>
              <Input placeholder="Source URL" value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} />
              <Input placeholder="Tags, separated by commas" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} />
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
              <Button disabled={isSaving} onClick={() => void saveIdea()}>
                {isSaving ? 'Saving...' : editingIdea ? 'Update idea' : 'Create idea'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="draft-preview-title">
          <div className="admin-panel flex max-h-[calc(100vh-48px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
              <div>
                <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Generated preview</p>
                <h2 id="draft-preview-title" className="mt-1 text-lg font-semibold text-[var(--text)]">{preview.title}</h2>
                {preview.excerpt ? <p className="mt-2 line-clamp-2 text-sm text-[var(--text-soft)]">{preview.excerpt}</p> : null}
              </div>
              <Button variant="ghost" onClick={closePreview}>Close</Button>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
              <pre className="min-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 font-['IBM_Plex_Mono'] text-xs leading-6 text-[var(--text)]">
                {preview.content}
              </pre>
              <aside className="space-y-3 text-sm text-[var(--text-soft)]">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
                  <p className="font-medium text-[var(--text)]">Draft metadata</p>
                  <p className="mt-2">Status after create: writing</p>
                  <p className="mt-1">Published: false</p>
                  {preview.sourceUrl ? <p className="mt-1 break-all">Source: {preview.sourceUrl}</p> : null}
                </div>
                <Button className="w-full" disabled={busyId === preview.id} onClick={() => void confirmCreatePost()}>
                  {busyId === preview.id ? 'Creating...' : 'Create post draft'}
                </Button>
              </aside>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-4">
        <SectionTable title={`Draft ideas${meta ? ` · ${meta.total}` : ''}`}>
          {!items.length ? (
            <div className="p-5"><EmptyState message="No draft ideas match the current filters." /></div>
          ) : (
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-[var(--bg-elevated)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Idea</th>
                  <th className="px-5 py-3 font-medium">State</th>
                  <th className="px-5 py-3 font-medium">Updated</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((idea) => (
                  <tr key={idea.id} className="border-t border-[var(--border)]">
                    <td className="max-w-[620px] px-5 py-4 align-top">
                      <p className="font-medium text-[var(--text)]">{idea.title}</p>
                      {idea.summary ? <p className="mt-2 line-clamp-2 text-sm text-[var(--text-soft)]">{idea.summary}</p> : null}
                      {idea.angle ? <p className="mt-2 line-clamp-2 text-sm text-[var(--text)]">Angle: {idea.angle}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {idea.tags.map((tag) => <Badge key={tag} tone="warning">#{tag}</Badge>)}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={statusTone(idea.status)}>{idea.status}</Badge>
                        <Badge>{idea.sourceType}</Badge>
                        <Badge tone="warning">P{idea.priority}</Badge>
                        {idea.postId ? <Badge tone="success">draft linked</Badge> : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-[var(--text-soft)]">{formatDate(idea.updatedAt)}</td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" onClick={() => startEditing(idea)}>Edit</Button>
                        <Button variant="ghost" disabled={busyId === idea.id || Boolean(idea.postId)} onClick={() => void previewDraft(idea)}>
                          {busyId === idea.id ? 'Working...' : 'Preview draft'}
                        </Button>
                        {idea.sourceUrl ? <Button variant="ghost" onClick={() => window.open(idea.sourceUrl!, '_blank', 'noopener,noreferrer')}>Source</Button> : null}
                        <Button variant="danger" onClick={() => void removeIdea(idea)}>Delete</Button>
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
