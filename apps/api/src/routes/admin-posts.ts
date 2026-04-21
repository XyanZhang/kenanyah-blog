import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { adminAuthMiddleware, requireAdminRole } from '../middleware/admin-auth'
import { validateBody, validateQuery } from '../middleware/validation'
import { NotFoundError } from '../middleware/error'
import {
  adminPostQuerySchema,
  adminPostUpdateSchema,
  type AdminPostQueryInput,
  type AdminPostUpdateInput,
} from '@blog/validation'
import { indexPost } from '../lib/semantic-search'
import { syncPostEvent } from '../lib/calendar-events'

type AdminPostVariables = {
  validatedQuery: unknown
  validatedBody: unknown
}

const adminPosts = new Hono<{ Variables: AdminPostVariables }>()

adminPosts.get(
  '/',
  adminAuthMiddleware,
  requireAdminRole('ADMIN'),
  validateQuery(adminPostQuerySchema),
  async (c) => {
    const query = c.get('validatedQuery') as AdminPostQueryInput
    const page = query.page || 1
    const limit = query.limit || 10
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ]
    }
    if (query.published !== 'all') {
      where.published = query.published === 'true'
    }
    if (query.featured !== 'all') {
      where.isFeatured = query.featured === 'true'
    }

    const [total, list] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      }),
    ])

    return c.json({
      success: true,
      data: list.map((post) => ({
        ...post,
        categories: post.categories.map((item) => item.category),
        tags: post.tags.map((item) => item.tag),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  }
)

adminPosts.get(
  '/:id',
  adminAuthMiddleware,
  requireAdminRole('ADMIN'),
  async (c) => {
    const { id } = c.req.param()
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    })

    if (!post) {
      throw new NotFoundError('Post not found')
    }

    return c.json({
      success: true,
      data: {
        ...post,
        categories: post.categories.map((item) => item.category),
        tags: post.tags.map((item) => item.tag),
      },
    })
  }
)

adminPosts.patch(
  '/:id',
  adminAuthMiddleware,
  requireAdminRole('ADMIN'),
  validateBody(adminPostUpdateSchema),
  async (c) => {
    const { id } = c.req.param()
    const data = c.get('validatedBody') as AdminPostUpdateInput

    const existingPost = await prisma.post.findUnique({
      where: { id },
      include: {
        categories: true,
        tags: true,
      },
    })
    if (!existingPost) {
      throw new NotFoundError('Post not found')
    }

    const post = await prisma.post.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt === undefined ? undefined : data.excerpt,
        coverImage: data.coverImage === undefined ? undefined : data.coverImage,
        published: data.published,
        publishedAt:
          data.publishedAt === undefined
            ? undefined
            : data.publishedAt
              ? new Date(data.publishedAt)
              : null,
        isFeatured: data.isFeatured,
        categories: data.categoryIds
          ? {
              deleteMany: {},
              create: data.categoryIds.map((categoryId) => ({ categoryId })),
            }
          : undefined,
        tags: data.tagIds
          ? {
              deleteMany: {},
              create: data.tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    })

    indexPost(post.id).catch((err) =>
      console.error('[admin-posts] index post failed:', err)
    )
    syncPostEvent(post).catch((err) =>
      console.error('[admin-posts] sync post event failed:', err)
    )

    return c.json({
      success: true,
      data: {
        ...post,
        categories: post.categories.map((item) => item.category),
        tags: post.tags.map((item) => item.tag),
      },
    })
  }
)

export default adminPosts
