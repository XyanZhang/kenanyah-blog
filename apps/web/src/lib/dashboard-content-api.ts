import { apiClient, type ApiResponse } from './api-client'

export type DashboardPostSummary = {
  id: string
  slug: string
  title: string
  excerpt: string
  coverImage: string
  publishedAt: Date
}

export type DashboardStats = {
  posts: number
  views: number
  comments: number
}

export type DashboardTaxonomyItem = {
  id: string
  slug: string
  name: string
  count: number
}

type PostFromApi = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  coverImage: string | null
  publishedAt: string | null
  createdAt: string
}

type TaxonomyFromApi = {
  id: string
  slug: string
  name: string
  _count?: {
    posts?: number
  }
}

function mapPost(post: PostFromApi): DashboardPostSummary {
  const date = post.publishedAt ?? post.createdAt
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt ?? '',
    coverImage: post.coverImage ?? '',
    publishedAt: new Date(date),
  }
}

function mapTaxonomy(item: TaxonomyFromApi): DashboardTaxonomyItem {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    count: item._count?.posts ?? 0,
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await apiClient.get('posts/stats').json<ApiResponse<DashboardStats>>()
  if (!res.success || !res.data) {
    throw new Error(res.error ?? '加载统计失败')
  }
  return res.data
}

export async function getRecentDashboardPosts(limit: number): Promise<DashboardPostSummary[]> {
  const res = await apiClient
    .get('posts', { searchParams: { published: true, limit } })
    .json<ApiResponse<PostFromApi[]>>()
  if (!res.success || !res.data) {
    throw new Error(res.error ?? '加载文章失败')
  }
  return res.data.map(mapPost)
}

export async function getDashboardTaxonomyItems(
  type: 'categories' | 'tags'
): Promise<DashboardTaxonomyItem[]> {
  const endpoint = type === 'categories' ? 'categories' : 'tags'
  const res = await apiClient.get(endpoint).json<ApiResponse<TaxonomyFromApi[]>>()
  if (!res.success || !res.data) {
    throw new Error(res.error ?? '加载分类失败')
  }
  return res.data.map(mapTaxonomy).sort((left, right) => right.count - left.count)
}
