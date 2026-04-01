import { generateSlug } from '@blog/utils'
import { prisma } from '../lib/db'
import { indexPost } from '../lib/semantic-search'

export type CreateAIBlogInput = {
  authorId: string
  title: string
  content: string
  excerpt?: string
  coverImage?: string
  published?: boolean
}

function safeSlug(title: string): string {
  const base = generateSlug(title) || `post-${Date.now()}`
  return base
}

async function ensureUniqueSlug(initialSlug: string) {
  let slug = initialSlug
  const existing = await prisma.post.findUnique({ where: { slug } })
  if (existing) {
    slug = `${slug}-${Date.now()}`
  }
  return slug
}

export async function createAndMaybePublishPost(input: CreateAIBlogInput) {
  const published = input.published === true
  const maxAttempts = 4
  let lastError: unknown = null
  let post:
    | {
        id: string
        slug: string
        title: string
        published: boolean
        publishedAt: Date | null
      }
    | null = null

  for (let i = 0; i < maxAttempts; i += 1) {
    const seed = i === 0 ? safeSlug(input.title) : `${safeSlug(input.title)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const slug = await ensureUniqueSlug(seed)
    try {
      post = await prisma.post.create({
        data: {
          slug,
          title: input.title,
          content: input.content,
          excerpt: input.excerpt,
          coverImage: input.coverImage,
          authorId: input.authorId,
          published,
          publishedAt: published ? new Date() : null,
        },
        select: {
          id: true,
          slug: true,
          title: true,
          published: true,
          publishedAt: true,
        },
      })
      break
    } catch (e: unknown) {
      const prismaErr = e as { code?: string }
      if (prismaErr?.code !== 'P2002') {
        throw e
      }
      lastError = e
    }
  }

  if (!post) {
    throw lastError instanceof Error ? lastError : new Error('创建文章失败，请重试')
  }

  indexPost(post.id).catch((err) => {
    console.error('[semantic-search] index post failed:', err)
  })

  return post
}
