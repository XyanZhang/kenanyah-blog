import { useEffect, useState } from 'react'
import type { AdminTaxonomyItem } from '@blog/types'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SectionTable } from '@/components/SectionTable'
import { Button, Card, Input } from '@/components/ui'
import {
  createAdminCategory,
  createAdminTag,
  deleteAdminCategory,
  deleteAdminTag,
  getAdminCategories,
  getAdminTags,
} from '@/lib/api'

export function TaxonomyPage() {
  const [categories, setCategories] = useState<AdminTaxonomyItem[]>([])
  const [tags, setTags] = useState<AdminTaxonomyItem[]>([])
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [tagName, setTagName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setError(null)
      const [categoryResult, tagResult] = await Promise.all([getAdminCategories(), getAdminTags()])
      setCategories(categoryResult.data)
      setTags(tagResult.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load taxonomy')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <>
      <div className="admin-sticky">
        <PageHeader
          eyebrow="Taxonomy"
          title="Keep categories and tags tidy"
          description="Add or clean taxonomy from one page so editors can keep article structure consistent."
        />
      </div>

      {error ? <p className="mb-4 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="mb-4 grid gap-3 xl:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-[var(--text)]">New category</h2>
          <div className="mt-3 space-y-2">
            <Input placeholder="Category name" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} />
            <Input placeholder="Description" value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} />
            <Button
              onClick={async () => {
                await createAdminCategory({ name: categoryName, description: categoryDescription || undefined })
                setCategoryName('')
                setCategoryDescription('')
                await load()
              }}
            >
              Create category
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-[var(--text)]">New tag</h2>
          <div className="mt-3 space-y-2">
            <Input placeholder="Tag name" value={tagName} onChange={(event) => setTagName(event.target.value)} />
            <Button
              onClick={async () => {
                await createAdminTag({ name: tagName })
                setTagName('')
                await load()
              }}
            >
              Create tag
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionTable title={`Categories · ${categories.length}`}>
          {!categories.length ? (
            <div className="p-5">
              <EmptyState message="No categories yet." />
            </div>
          ) : (
          <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-[var(--bg-elevated)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Slug</th>
                  <th className="px-5 py-3 font-medium">Posts</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--border)]">
                    <td className="px-5 py-4 text-[var(--text)]">{item.name}</td>
                    <td className="px-5 py-4 text-[var(--text-muted)]">{item.slug}</td>
                    <td className="px-5 py-4 text-[var(--text-soft)]">{item._count?.posts ?? 0}</td>
                    <td className="px-5 py-4">
                      <Button variant="danger" onClick={async () => {
                        await deleteAdminCategory(item.id)
                        await load()
                      }}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionTable>

        <SectionTable title={`Tags · ${tags.length}`}>
          {!tags.length ? (
            <div className="p-5">
              <EmptyState message="No tags yet." />
            </div>
          ) : (
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-[var(--bg-elevated)]">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Slug</th>
                  <th className="px-5 py-3 font-medium">Posts</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--border)]">
                    <td className="px-5 py-4 text-[var(--text)]">{item.name}</td>
                    <td className="px-5 py-4 text-[var(--text-muted)]">{item.slug}</td>
                    <td className="px-5 py-4 text-[var(--text-soft)]">{item._count?.posts ?? 0}</td>
                    <td className="px-5 py-4">
                      <Button variant="danger" onClick={async () => {
                        await deleteAdminTag(item.id)
                        await load()
                      }}>
                        Delete
                      </Button>
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
