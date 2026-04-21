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

export interface AdminRecentPost {
  id: string
  title: string
  slug: string
  published: boolean
  isFeatured: boolean
  updatedAt: Date
  author: {
    id: string
    username: string
    name: string | null
  }
}

export interface AdminDashboardData {
  stats: AdminDashboardStats
  recentPosts: AdminRecentPost[]
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
  size: number
  mimeType: string
  updatedAt: string
  subdir: string
}
