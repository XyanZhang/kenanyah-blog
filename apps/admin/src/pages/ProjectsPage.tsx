import { useEffect, useMemo, useState } from 'react'
import type { PaginationMeta, ProjectEntryDto } from '@blog/types'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SectionTable } from '@/components/SectionTable'
import { Badge, Button, Input } from '@/components/ui'
import {
  createAdminProject,
  deleteAdminProject,
  getAdminProjects,
  updateAdminProject,
} from '@/lib/api'

type ProjectStatus = 'planned' | 'active' | 'completed' | 'archived'

type ProjectFormState = {
  title: string
  description: string
  href: string
  coverImage: string
  category: string
  tags: string
  status: ProjectStatus
  date: string
}

const emptyForm: ProjectFormState = {
  title: '',
  description: '',
  href: '',
  coverImage: '',
  category: '',
  tags: '',
  status: 'active',
  date: '',
}

function tagsFromInput(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function dateFromIso(value: string | null) {
  return value ? value.slice(0, 10) : ''
}

function formFromProject(project: ProjectEntryDto): ProjectFormState {
  return {
    title: project.title,
    description: project.description ?? '',
    href: project.href ?? '',
    coverImage: project.coverImage ?? '',
    category: project.category ?? '',
    tags: project.tags.join(', '),
    status: project.status as ProjectStatus,
    date: dateFromIso(project.startedAt),
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

function statusTone(status: string): 'default' | 'success' | 'warning' {
  if (status === 'completed') return 'success'
  if (status === 'planned') return 'warning'
  return 'default'
}

export function ProjectsPage() {
  const [items, setItems] = useState<ProjectEntryDto[]>([])
  const [meta, setMeta] = useState<PaginationMeta | undefined>()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all')
  const [category, setCategory] = useState('')
  const [form, setForm] = useState<ProjectFormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const editingProject = useMemo(
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
        status,
      })
      if (category.trim()) {
        params.set('category', category.trim())
      }
      const result = await getAdminProjects(params)
      setItems(result.data)
      setMeta(result.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    }
  }

  useEffect(() => {
    void load()
  }, [status])

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

  const saveProject = async () => {
    try {
      setIsSaving(true)
      setError(null)
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        href: form.href.trim() || null,
        coverImage: form.coverImage.trim() || null,
        category: form.category.trim() || null,
        tags: tagsFromInput(form.tags),
        status: form.status,
        date: form.date || null,
      }

      if (editingId) {
        await updateAdminProject(editingId, payload)
      } else {
        await createAdminProject(payload)
      }

      resetForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project')
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (project: ProjectEntryDto) => {
    setEditingId(project.id)
    setForm(formFromProject(project))
    setError(null)
    setIsFormOpen(true)
  }

  const removeProject = async (project: ProjectEntryDto) => {
    if (!window.confirm(`Delete "${project.title}"?`)) return
    await deleteAdminProject(project.id)
    if (editingId === project.id) {
      resetForm()
    }
    await load()
  }

  return (
    <>
      <div className="admin-sticky space-y-3">
        <PageHeader
          eyebrow="Projects"
          title="Manage project entries"
          description="Create, update, and curate the project records used by the public project timeline."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => void load()}>
                Refresh
              </Button>
              <Button onClick={openCreateForm}>New project</Button>
            </div>
          }
        />

        <div className="admin-panel grid gap-2 rounded-2xl p-3 md:grid-cols-4">
          <Input placeholder="Search title, link, description" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Input placeholder="Exact category" value={category} onChange={(event) => setCategory(event.target.value)} />
          <select className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | 'all')}>
            <option value="all">All statuses</option>
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          <Button onClick={() => void load()}>Apply filters</Button>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p> : null}

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="project-form-title">
          <div className="admin-panel max-h-[calc(100vh-48px)] w-full max-w-2xl overflow-y-auto rounded-2xl p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Project</p>
                <h2 id="project-form-title" className="mt-1 text-lg font-semibold text-[var(--text)]">
                  {editingProject ? 'Edit project' : 'New project'}
                </h2>
              </div>
              <Button variant="ghost" onClick={resetForm}>
                Close
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              <Input placeholder="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              <textarea
                className="min-h-28 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                placeholder="Description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Project URL" value={form.href} onChange={(event) => setForm({ ...form, href: event.target.value })} />
                <Input placeholder="Cover image URL" value={form.coverImage} onChange={(event) => setForm({ ...form, coverImage: event.target.value })} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Input placeholder="Category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
                <Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
                <select className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectStatus })}>
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <Input placeholder="Tags, separated by commas" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} />
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
              <Button disabled={isSaving} onClick={() => void saveProject()}>
                {isSaving ? 'Saving...' : editingProject ? 'Update project' : 'Create project'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-4">
        <SectionTable title={`Projects${meta ? ` · ${meta.total}` : ''}`}>
          {!items.length ? (
            <div className="p-5">
              <EmptyState message="No projects match the current filters." />
            </div>
          ) : (
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-[var(--bg-elevated)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Project</th>
                  <th className="px-5 py-3 font-medium">Meta</th>
                  <th className="px-5 py-3 font-medium">Started</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((project) => (
                  <tr key={project.id} className="border-t border-[var(--border)]">
                    <td className="max-w-[520px] px-5 py-4 align-top">
                      <p className="font-medium text-[var(--text)]">{project.title}</p>
                      {project.href ? <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{project.href}</p> : null}
                      {project.description ? <p className="mt-2 line-clamp-2 text-sm text-[var(--text-soft)]">{project.description}</p> : null}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={statusTone(project.status)}>{project.status}</Badge>
                        {project.category ? <Badge tone="success">{project.category}</Badge> : null}
                        {project.tags.map((tag) => (
                          <Badge key={tag} tone="warning">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-[var(--text-soft)]">{formatDate(project.startedAt)}</td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" onClick={() => startEditing(project)}>
                          Edit
                        </Button>
                        {project.href ? (
                          <Button variant="ghost" onClick={() => window.open(project.href!, '_blank', 'noopener,noreferrer')}>
                            Open
                          </Button>
                        ) : null}
                        <Button variant="danger" onClick={() => void removeProject(project)}>
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
