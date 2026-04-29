export enum AdminRole {
  ADMIN = 'ADMIN',
}

export interface AdminUser {
  id: string
  email: string
  name: string | null
  role: AdminRole
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface AdminDashboardStats {
  totalPosts: number
  draftPosts: number
  pendingComments: number
  categoryCount: number
  tagCount: number
}

export interface AdminDashboardKpis extends AdminDashboardStats {}

export interface AdminDashboardTrendPoint {
  date: string
  label: string
  createdPosts: number
  publishedPosts: number
  draftPosts: number
}

export interface AdminDashboardModerationSummary {
  pending: number
  approved: number
}

export interface AdminDashboardDistributionItem {
  id: string
  label: string
  value: number
  slug?: string
}

export type AdminDashboardActivityType = 'post_updated' | 'comment_pending' | 'comment_approved'

export interface AdminDashboardActivityItem {
  id: string
  type: AdminDashboardActivityType
  title: string
  description: string
  timestamp: Date
  href?: string
}

export interface AdminDashboardActionItem {
  id: string
  label: string
  value: number
  tone: 'default' | 'success' | 'warning'
  description: string
}

export interface AdminDashboardData {
  kpis: AdminDashboardKpis
  publishingTrend: AdminDashboardTrendPoint[]
  publishingBreakdown: AdminDashboardTrendPoint[]
  commentModeration: AdminDashboardModerationSummary
  categoryDistribution: AdminDashboardDistributionItem[]
  recentActivity: AdminDashboardActivityItem[]
  actionItems: AdminDashboardActionItem[]
}

export interface AdminPostListItem {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  published: boolean
  publishedAt: Date | null
  isFeatured: boolean
  viewCount: number
  updatedAt: Date
  createdAt: Date
  author: {
    id: string
    username: string
    name: string | null
  }
  categories: Array<{
    id: string
    name: string
    slug: string
  }>
  tags: Array<{
    id: string
    name: string
    slug: string
  }>
  _count: {
    comments: number
  }
}

export interface AdminCommentItem {
  id: string
  content: string
  approved: boolean
  createdAt: Date
  updatedAt: Date
  post: {
    id: string
    title: string
    slug: string
  }
  author: {
    id: string
    username: string
    name: string | null
    avatar: string | null
  }
}

export interface AdminTaxonomyItem {
  id: string
  name: string
  slug: string
  description?: string | null
  createdAt: Date
  updatedAt: Date
  _count?: {
    posts: number
  }
}

export interface AdminMediaItem {
  id: string
  name: string
  url: string
  storageKey?: string
  size: number
  mimeType: string
  width?: number | null
  height?: number | null
  variants?: Record<string, unknown> | null
  source?: string
  status?: string
  category?: 'image' | 'pdf' | 'other'
  updatedAt: string
  subdir: string
}

export interface AdminBookmarkItem {
  id: string
  title: string
  url: string
  notes: string | null
  category: string | null
  tags: string[]
  source: string
  favicon: string | null
  createdAt: Date
  updatedAt: Date
}

export interface BookmarkMetadataResult {
  title: string | null
  favicon: string | null
  description: string | null
  duplicate: AdminBookmarkItem | null
}

export interface BookmarkLinkCheckResult {
  ok: boolean
  status: number | null
  statusText: string | null
  finalUrl: string
  checkedAt: string
  error: string | null
}

export interface BookmarkConversionResult {
  target: 'thought' | 'draft_post'
  id: string
  slug?: string
}

export interface AdminThoughtItem {
  id: string
  authorId: string | null
  content: string
  images: string[]
  likeCount: number
  commentCount: number
  createdAt: Date
  updatedAt: Date
  author: {
    id: string
    username: string
    name: string | null
    avatar: string | null
  } | null
}
