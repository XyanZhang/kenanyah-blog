import { useEffect, useMemo, useState } from 'react'
import type { AdminBookmarkItem, BookmarkLinkCheckResult, PaginationMeta } from '@blog/types'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SectionTable } from '@/components/SectionTable'
import { Badge, Button, Input } from '@/components/ui'
import {
  createAdminBookmark,
  deleteAdminBookmark,
  checkAdminBookmark,
  convertAdminBookmark,
  enrichAdminBookmark,
  getAdminBookmarkMetadata,
  getAdminBookmarks,
  updateAdminBookmark,
} from '@/lib/api'

type BookmarkFormState = {
  title: string
  url: string
  notes: string
  category: string
  tags: string
  favicon: string
}

const emptyForm: BookmarkFormState = {
  title: '',
  url: '',
  notes: '',
  category: '',
  tags: '',
  favicon: '',
}

function tagsFromInput(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function formFromBookmark(bookmark: AdminBookmarkItem): BookmarkFormState {
  return {
    title: bookmark.title,
    url: bookmark.url,
    notes: bookmark.notes ?? '',
    category: bookmark.category ?? '',
    tags: bookmark.tags.join(', '),
    favicon: bookmark.favicon ?? '',
  }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function BookmarksPage() {
  const [items, setItems] = useState<AdminBookmarkItem[]>([])
  const [meta, setMeta] = useState<PaginationMeta | undefined>()
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('all')
  const [category, setCategory] = useState('')
  const [form, setForm] = useState<BookmarkFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [linkChecks, setLinkChecks] = useState<Record<string, BookmarkLinkCheckResult>>({})

  const editingBookmark = useMemo(
    () => items.find((item) => item.id === editingId),
    [editingId, items]
  )

  const load = async () => {
    try {
      setError(null)
      setNotice(null)
      const params = new URLSearchParams({
        page: '1',
        limit: '20',
        search,
        source,
      })
      if (category.trim()) {
        params.set('category', category.trim())
      }
      const result = await getAdminBookmarks(params)
      setItems(result.data)
      setMeta(result.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookmarks')
    }
  }

  useEffect(() => {
    void load()
  }, [source])

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

  const fillMetadata = async () => {
    const trimmedUrl = form.url.trim()
    if (!trimmedUrl) {
      setError('URL is required before enrichment')
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      setNotice(null)
      const result = await getAdminBookmarkMetadata(trimmedUrl)
      setForm((current) => ({
        ...current,
        title: current.title.trim() || result.data.title || current.title,
        notes: current.notes.trim() || result.data.description || current.notes,
        favicon: current.favicon.trim() || result.data.favicon || current.favicon,
      }))
      setNotice(
        result.data.duplicate
          ? 'Duplicate URL found. Edit the existing bookmark instead of creating a new one.'
          : 'Metadata loaded.'
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metadata')
    } finally {
      setIsSaving(false)
    }
  }

  const saveBookmark = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setNotice(null)
      const payload = {
        title: form.title.trim(),
        url: form.url.trim(),
        notes: form.notes.trim() || undefined,
        category: form.category.trim() || undefined,
        tags: tagsFromInput(form.tags),
        favicon: form.favicon.trim() || undefined,
      }

      if (editingId) {
        await updateAdminBookmark(editingId, {
          ...payload,
          notes: payload.notes ?? null,
          category: payload.category ?? null,
          favicon: payload.favicon ?? null,
        })
      } else {
        await createAdminBookmark(payload)
      }

      resetForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save bookmark')
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (bookmark: AdminBookmarkItem) => {
    setEditingId(bookmark.id)
    setForm(formFromBookmark(bookmark))
    setError(null)
    setNotice(null)
    setIsFormOpen(true)
  }

  const removeBookmark = async (bookmark: AdminBookmarkItem) => {
    if (!window.confirm(`Delete "${bookmark.title}"?`)) return
    await deleteAdminBookmark(bookmark.id)
    if (editingId === bookmark.id) {
      resetForm()
    }
    await load()
  }

  const enrichBookmark = async (bookmark: AdminBookmarkItem) => {
    try {
      setBusyId(bookmark.id)
      setError(null)
      setNotice(null)
      await enrichAdminBookmark(bookmark.id)
      setNotice(`Enriched "${bookmark.title}"`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enrich bookmark')
    } finally {
      setBusyId(null)
    }
  }

  const checkBookmark = async (bookmark: AdminBookmarkItem) => {
    try {
      setBusyId(bookmark.id)
      setError(null)
      setNotice(null)
      const result = await checkAdminBookmark(bookmark.id)
      setLinkChecks((current) => ({ ...current, [bookmark.id]: result.data }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check bookmark')
    } finally {
      setBusyId(null)
    }
  }

  const convertBookmark = async (bookmark: AdminBookmarkItem, target: 'thought' | 'draft_post') => {
    try {
      setBusyId(bookmark.id)
      setError(null)
      setNotice(null)
      const result = await convertAdminBookmark(bookmark.id, target)
      setNotice(
        target === 'thought'
          ? `Created thought ${result.data.id}`
          : `Created draft post ${result.data.slug ?? result.data.id}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert bookmark')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <div className="admin-sticky space-y-3">
        <PageHeader
          eyebrow="Bookmarks"
          title="Manage saved links"
          description="Search, create, update, and remove bookmark records from the admin console."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => void load()}>
                Refresh
              </Button>
              <Button onClick={openCreateForm}>New bookmark</Button>
            </div>
          }
        />

        <div className="admin-panel grid gap-2 rounded-2xl p-3 md:grid-cols-4">
          <Input
            placeholder="Search title, URL, notes"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Input
            placeholder="Exact category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
          <select
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="all">All sources</option>
            <option value="manual">Manual</option>
            <option value="browser_extension">Browser extension</option>
            <option value="api">API</option>
          </select>
          <Button onClick={() => void load()}>Apply filters</Button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-4 rounded-xl border border-[var(--success)]/20 bg-[var(--success-soft)] px-3 py-2 text-sm text-[var(--success)]">
          {notice}
        </p>
      ) : null}

      {isFormOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bookmark-form-title"
        >
          <div className="admin-panel max-h-[calc(100vh-48px)] w-full max-w-xl overflow-y-auto rounded-2xl p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Bookmark
                </p>
                <h2
                  id="bookmark-form-title"
                  className="mt-1 text-lg font-semibold text-[var(--text)]"
                >
                  {editingBookmark ? 'Edit bookmark' : 'New bookmark'}
                </h2>
              </div>
              <Button variant="ghost" onClick={resetForm}>
                Close
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              <Input
                placeholder="Title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="URL"
                  value={form.url}
                  onChange={(event) => setForm({ ...form, url: event.target.value })}
                />
                <Button variant="ghost" disabled={isSaving} onClick={() => void fillMetadata()}>
                  Enrich
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Category"
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                />
                <Input
                  placeholder="Favicon URL"
                  value={form.favicon}
                  onChange={(event) => setForm({ ...form, favicon: event.target.value })}
                />
              </div>
              <Input
                placeholder="Tags, separated by commas"
                value={form.tags}
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
              />
              <textarea
                className="min-h-28 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                placeholder="Notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
              <Button disabled={isSaving} onClick={() => void saveBookmark()}>
                {isSaving ? 'Saving...' : editingBookmark ? 'Update bookmark' : 'Create bookmark'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-4">
        <SectionTable title={`Bookmarks${meta ? ` · ${meta.total}` : ''}`}>
          {!items.length ? (
            <div className="p-5">
              <EmptyState message="No bookmarks match the current filters." />
            </div>
          ) : (
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-[var(--bg-elevated)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Bookmark</th>
                  <th className="px-5 py-3 font-medium">Meta</th>
                  <th className="px-5 py-3 font-medium">Updated</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((bookmark) => (
                  <tr key={bookmark.id} className="border-t border-[var(--border)]">
                    <td className="max-w-[420px] px-5 py-4 align-top">
                      <div className="flex items-start gap-3">
                        {bookmark.favicon ? (
                          <img
                            className="mt-0.5 size-5 shrink-0 rounded"
                            src={bookmark.favicon}
                            alt=""
                          />
                        ) : null}
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--text)]">{bookmark.title}</p>
                          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                            {bookmark.url}
                          </p>
                          {bookmark.notes ? (
                            <p className="mt-2 line-clamp-2 text-sm text-[var(--text-soft)]">
                              {bookmark.notes}
                            </p>
                          ) : null}
                          {linkChecks[bookmark.id] ? (
                            <p
                              className={
                                linkChecks[bookmark.id].ok
                                  ? 'mt-2 text-xs text-[var(--success)]'
                                  : 'mt-2 text-xs text-[var(--danger)]'
                              }
                            >
                              {linkChecks[bookmark.id].ok ? 'Link OK' : 'Link issue'}
                              {linkChecks[bookmark.id].status
                                ? ` · ${linkChecks[bookmark.id].status}`
                                : ''}
                              {linkChecks[bookmark.id].error
                                ? ` · ${linkChecks[bookmark.id].error}`
                                : ''}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Badge>{bookmark.source}</Badge>
                        {bookmark.category ? (
                          <Badge tone="success">{bookmark.category}</Badge>
                        ) : null}
                        {bookmark.tags.map((tag) => (
                          <Badge key={tag} tone="warning">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-[var(--text-soft)]">
                      {formatDate(bookmark.updatedAt)}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" onClick={() => startEditing(bookmark)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={busyId === bookmark.id}
                          onClick={() => void enrichBookmark(bookmark)}
                        >
                          Enrich
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={busyId === bookmark.id}
                          onClick={() => void checkBookmark(bookmark)}
                        >
                          Check
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={busyId === bookmark.id}
                          onClick={() => void convertBookmark(bookmark, 'thought')}
                        >
                          To thought
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={busyId === bookmark.id}
                          onClick={() => void convertBookmark(bookmark, 'draft_post')}
                        >
                          To draft
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => window.open(bookmark.url, '_blank', 'noopener,noreferrer')}
                        >
                          Open
                        </Button>
                        <Button variant="danger" onClick={() => void removeBookmark(bookmark)}>
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
