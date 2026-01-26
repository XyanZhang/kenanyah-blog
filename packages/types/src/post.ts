export interface Post {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string
  coverImage: string | null
  published: boolean
  publishedAt: Date | null
  viewCount: number
  authorId: string
  createdAt: Date
  updatedAt: Date
}

export type CreatePostDto = Pick<
  Post,
  'title' | 'content' | 'excerpt' | 'coverImage' | 'published'
> & {
  categoryIds?: string[]
  tagIds?: string[]
}

export type UpdatePostDto = Partial<CreatePostDto>

export interface PostWithRelations extends Post {
  author: {
    id: string
    username: string
    name: string | null
    avatar: string | null
  }
  categories: Array<{
    id: string
    slug: string
    name: string
  }>
  tags: Array<{
    id: string
    slug: string
    name: string
  }>
  _count?: {
    comments: number
  }
}
