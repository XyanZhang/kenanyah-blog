import { useEffect, useState } from 'react'
import type { AdminPostListItem, PaginationMeta } from '@blog/types'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SectionTable } from '@/components/SectionTable'
import { Badge, Button, Input } from '@/components/ui'
import { SITE_BASE_URL, getAdminPosts, updateAdminPost } from '@/lib/api'

export function PostsPage() {
  const [search, setSearch] = useState('')
  const [published, setPublished] = useState('all')
  const [featured, setFeatured] = useState('all')
  const [items, setItems] = useState<AdminPostListItem[]>([])
  const [meta, setMeta] = useState<PaginationMeta | undefined>()
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setError(null)
      const params = new URLSearchParams({
        page: '1',
        limit: '20',
        search,
        published,
        featured,
      })
      const result = await getAdminPosts(params)
      setItems(result.data)
      setMeta(result.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts')
    }
  }

  useEffect(() => {
    void load()
  }, [featured, published])

  const handleToggleFeatured = async (post: AdminPostListItem) => {
    await updateAdminPost(post.id, { isFeatured: !post.isFeatured })
    await load()
  }

  const handleTogglePublished = async (post: AdminPostListItem) => {
    await updateAdminPost(post.id, {
      published: !post.published,
      publishedAt: !post.published ? new Date().toISOString() : null,
    })
    await load()
  }

  return (
    <>
      <div className="admin-sticky space-y-3">
        <PageHeader
          eyebrow="Posts"
          title="Manage articles and publishing state"
          description="Filter posts, search titles, and quickly update featured or publish status without leaving the console."
          actions={
            <>
              <Button variant="ghost" onClick={() => void load()}>
                Refresh
              </Button>
              <Button onClick={() => window.open(`${SITE_BASE_URL}/blog/editor`, '_blank')}>
                Open editor
              </Button>
            </>
          }
        />

        <div className="admin-panel grid gap-2 rounded-2xl p-3 md:grid-cols-4">
          <Input placeholder="Search posts" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none" value={published} onChange={(event) => setPublished(event.target.value)}>
            <option value="all">All publish states</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>
          <select className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text)] outline-none" value={featured} onChange={(event) => setFeatured(event.target.value)}>
            <option value="all">All feature states</option>
            <option value="true">Featured</option>
            <option value="false">Standard</option>
          </select>
          <Button onClick={() => void load()}>Apply filters</Button>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p> : null}

      <SectionTable title={`Posts${meta ? ` · ${meta.total}` : ''}`}>
        {!items.length ? (
          <div className="p-5">
            <EmptyState message="No posts match the current filters." />
          </div>
        ) : (
          <table className="admin-table min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-elevated)]">
              <tr>
                <th className="px-5 py-3 font-medium">Post</th>
                <th className="px-5 py-3 font-medium">State</th>
                <th className="px-5 py-3 font-medium">Taxonomy</th>
                <th className="px-5 py-3 font-medium">Metrics</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((post) => (
                <tr key={post.id} className="border-t border-[var(--border)]">
                  <td className="px-5 py-4 align-top">
                    <p className="font-medium text-[var(--text)]">{post.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      /{post.slug} · {post.author.name ?? post.author.username}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={post.published ? 'success' : 'warning'}>{post.published ? 'Published' : 'Draft'}</Badge>
                      {post.isFeatured ? <Badge>Featured</Badge> : null}
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top text-[var(--text-soft)]">
                    <p>{post.categories.map((item) => item.name).join(', ') || 'No category'}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{post.tags.map((item) => `#${item.name}`).join(' ') || 'No tags'}</p>
                  </td>
                  <td className="px-5 py-4 align-top text-[var(--text-soft)]">
                    <p>{post.viewCount} views</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{post._count.comments} comments</p>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" onClick={() => void handleToggleFeatured(post)}>
                        {post.isFeatured ? 'Unfeature' : 'Feature'}
                      </Button>
                      <Button variant="ghost" onClick={() => void handleTogglePublished(post)}>
                        {post.published ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button variant="ghost" onClick={() => window.open(`${SITE_BASE_URL}/posts/${post.slug}`, '_blank')}>
                        Preview
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
