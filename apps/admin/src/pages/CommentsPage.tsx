import { useEffect, useState } from 'react'
import type { AdminCommentItem, PaginationMeta } from '@blog/types'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SectionTable } from '@/components/SectionTable'
import { Badge, Button, Input } from '@/components/ui'
import { getAdminComments, moderateComment } from '@/lib/api'

export function CommentsPage() {
  const [search, setSearch] = useState('')
  const [approved, setApproved] = useState('all')
  const [items, setItems] = useState<AdminCommentItem[]>([])
  const [meta, setMeta] = useState<PaginationMeta | undefined>()
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setError(null)
      const params = new URLSearchParams({
        page: '1',
        limit: '20',
        search,
        approved,
      })
      const result = await getAdminComments(params)
      setItems(result.data)
      setMeta(result.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments')
    }
  }

  useEffect(() => {
    void load()
  }, [approved])

  const handleModerate = async (comment: AdminCommentItem, nextApproved: boolean) => {
    await moderateComment(comment.id, nextApproved)
    await load()
  }

  return (
    <>
      <div className="admin-sticky space-y-3">
        <PageHeader
          eyebrow="Moderation"
          title="Review comments quickly"
          description="Focus on pending comments, search by article or author, and approve or reject with one click."
        />

        <div className="admin-panel grid gap-2 rounded-2xl p-3 md:grid-cols-3">
          <Input placeholder="Search comments" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none" value={approved} onChange={(event) => setApproved(event.target.value)}>
            <option value="all">All moderation states</option>
            <option value="true">Approved</option>
            <option value="false">Pending</option>
          </select>
          <Button onClick={() => void load()}>Apply filters</Button>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p> : null}

      <SectionTable title={`Comments${meta ? ` · ${meta.total}` : ''}`}>
        {!items.length ? (
          <div className="p-5">
            <EmptyState message="No comments match the current filters." />
          </div>
        ) : (
          <table className="admin-table min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-elevated)]">
              <tr>
                <th className="px-5 py-3 font-medium">Comment</th>
                <th className="px-5 py-3 font-medium">Post</th>
                <th className="px-5 py-3 font-medium">Author</th>
                <th className="px-5 py-3 font-medium">State</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((comment) => (
                <tr key={comment.id} className="border-t border-[var(--border)]">
                  <td className="max-w-xl px-5 py-4 text-[var(--text)]">{comment.content}</td>
                  <td className="px-5 py-4 text-[var(--text-soft)]">{comment.post.title}</td>
                  <td className="px-5 py-4 text-[var(--text-soft)]">{comment.author.name ?? comment.author.username}</td>
                  <td className="px-5 py-4">
                    <Badge tone={comment.approved ? 'success' : 'warning'}>{comment.approved ? 'Approved' : 'Pending'}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" onClick={() => void handleModerate(comment, true)}>
                        Approve
                      </Button>
                      <Button variant="danger" onClick={() => void handleModerate(comment, false)}>
                        Reject
                      </Button>
                    </div>
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
