import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { authMiddleware } from '../middleware/auth'
import { validateBody, validateQuery } from '../middleware/validation'
import {
  createPostSchema,
  updatePostSchema,
  postQuerySchema,
  type CreatePostInput,
  type UpdatePostInput,
  type PostQueryInput,
} from '@blog/validation'
import { generateSlug } from '@blog/utils'
import { NotFoundError, ForbiddenError } from '../middleware/error'
import { indexPost, removePostFromIndex } from '../lib/semantic-search'
import { removeEventsForSource, syncPostEvent } from '../lib/calendar-events'

type PostVariables = {
  validatedBody: unknown
  validatedQuery: unknown
  user: { userId: string; role: string }
}

const posts = new Hono<{ Variables: PostVariables }>()

// List posts
posts.get('/', validateQuery(postQuerySchema), async (c) => {
  const query = c.get('validatedQuery') as PostQueryInput

  const page = query.page || 1
  const limit = query.limit || 10
  const skip = (page - 1) * limit

  const where: any = {}

  if (query.published !== undefined) {
    where.published = query.published
  }

  if (query.category) {
    where.categories = {
      some: {
        category: {
          slug: query.category,
        },
      },
    }
  }

  if (query.tag) {
    where.tags = {
      some: {
        tag: {
          slug: query.tag,
        },
      },
    }
  }

  const [total, postsList] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
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
    data: postsList,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
})

/** 获取有发布文章的日期列表（供日历卡片「有文章」圆点使用），公开接口，无需鉴权 */
posts.get('/published-dates', async (c) => {
  const from = c.req.query('from') // YYYY-MM-DD
  const to = c.req.query('to')     // YYYY-MM-DD
  const fromDate = from ? new Date(from + 'T00:00:00.000Z') : null
  const toDate = to ? new Date(to + 'T23:59:59.999Z') : null
  if (from && Number.isNaN(fromDate!.getTime())) {
    return c.json({ success: false, error: '无效的 from 日期' }, 400)
  }
  if (to && Number.isNaN(toDate!.getTime())) {
    return c.json({ success: false, error: '无效的 to 日期' }, 400)
  }

  const dateFilter: { not?: null; gte?: Date; lte?: Date } =
    fromDate || toDate
      ? { ...(fromDate && { gte: fromDate }), ...(toDate && { lte: toDate }) }
      : { not: null }
  const where = {
    published: true,
    publishedAt: dateFilter,
  }

  const postsWithDates = await prisma.post.findMany({
    where,
    select: { publishedAt: true },
  })
  const dates = [...new Set(
    postsWithDates
      .map((p) => p.publishedAt)
      .filter((d): d is Date => d != null)
      .map((d) => d.toISOString().slice(0, 10))
  )].sort()
  return c.json({ success: true, data: dates })
})

// Get post by id (for edit page)
posts.get('/by-id/:id', async (c) => {
  const { id } = c.req.param()

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          bio: true,
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
    },
  })

  if (!post) {
    throw new NotFoundError('Post not found')
  }

  return c.json({
    success: true,
    data: post,
  })
})

// Get post by slug (or by id when slug 为空时列表用 id 作为链接)
posts.get('/:slug', async (c) => {
  const { slug } = c.req.param()

  let post = await prisma.post.findUnique({
    where: { slug },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          bio: true,
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
    post = await prisma.post.findUnique({
      where: { id: slug },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            bio: true,
          },
        },
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        _count: { select: { comments: true } },
      },
    })
  }

  if (!post) {
    throw new NotFoundError('Post not found')
  }

  // Increment view count
  await prisma.post.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  })

  return c.json({
    success: true,
    data: post,
  })
})

// Create post
posts.post('/', authMiddleware, validateBody(createPostSchema), async (c) => {
  const data = c.get('validatedBody') as CreatePostInput
  const { userId } = c.get('user')

  let slugToUse = generateSlug(data.title)
  if (!slugToUse) {
    // 纯中文等标题可能生成空 slug；用时间戳兜底
    slugToUse = `post-${Date.now()}`
  }

  // Check if slug already exists
  const existingPost = await prisma.post.findUnique({
    where: { slug: slugToUse },
  })

  if (existingPost) {
    // Append timestamp to make it unique
    slugToUse = `${slugToUse}-${Date.now()}`
  }

  const post = await prisma.post.create({
    data: {
      slug: slugToUse,
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      coverImage: data.coverImage,
      published: data.published || false,
      publishedAt: data.published
        ? data.publishedAt
          ? new Date(data.publishedAt)
          : new Date()
        : null,
      isFeatured: data.isFeatured ?? false,
      authorId: userId,
      categories: data.categoryIds
        ? {
            create: data.categoryIds.map((categoryId) => ({
              categoryId,
            })),
          }
        : undefined,
      tags: data.tagIds
        ? {
            create: data.tagIds.map((tagId) => ({
              tagId,
            })),
          }
        : undefined,
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
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
    },
  })

  indexPost(post.id).catch((err) =>
    console.error('[semantic-search] index post failed:', err)
  )
  syncPostEvent(post).catch((err) =>
    console.error('[calendar-events] sync post event failed:', err)
  )

  return c.json(
    {
      success: true,
      data: post,
    },
    201
  )
})

// Update post
posts.patch('/:id', authMiddleware, validateBody(updatePostSchema), async (c) => {
  const { id } = c.req.param()
  const data = c.get('validatedBody') as UpdatePostInput
  const { userId, role } = c.get('user')

  const existingPost = await prisma.post.findUnique({
    where: { id },
  })

  if (!existingPost) {
    throw new NotFoundError('Post not found')
  }

  // Check if user is author or admin
  if (existingPost.authorId !== userId && role !== 'ADMIN') {
    throw new ForbiddenError('You can only edit your own posts')
  }

  const updateData: any = {}

  if (data.title) {
    updateData.title = data.title
    const newSlug = generateSlug(data.title)
    if (newSlug) {
      updateData.slug = newSlug
    } else if (!existingPost.slug) {
      // 纯中文等标题会生成空 slug，用 id 兜底，避免列表无法点击
      updateData.slug = existingPost.id
    }
    // 否则保留原 slug
  }
  if (data.excerpt !== undefined) updateData.excerpt = data.excerpt
  if (data.content) updateData.content = data.content
  if (data.coverImage !== undefined) updateData.coverImage = data.coverImage
  if (data.published !== undefined) {
    updateData.published = data.published
    if (!data.published) {
      updateData.publishedAt = null
    }
  }
  if (data.publishedAt !== undefined && data.published !== false) {
    const parsed = new Date(data.publishedAt)
    if (Number.isNaN(parsed.getTime())) {
      return c.json(
        { success: false, error: 'publishedAt 格式无效，请使用 ISO 8601 日期时间' },
        400
      )
    }
    updateData.publishedAt = parsed
  } else if (data.published === false) {
    updateData.publishedAt = null
  }
  if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured

  let post
  try {
    post = await prisma.post.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
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
      },
    })
  } catch (e: unknown) {
    const prismaErr = e as { code?: string; meta?: unknown }
    if (prismaErr?.code === 'P2002') {
      return c.json(
        { success: false, error: '该标题对应的 slug 已存在，请修改标题' },
        409
      )
    }
    if (prismaErr?.code === 'P2025') {
      return c.json({ success: false, error: 'Post not found' }, 404)
    }
    throw e
  }

  indexPost(post.id).catch((err) =>
    console.error('[semantic-search] index post failed:', err)
  )
  syncPostEvent(post).catch((err) =>
    console.error('[calendar-events] sync post event failed:', err)
  )

  return c.json({
    success: true,
    data: post,
  })
})

// Delete post
posts.delete('/:id', authMiddleware, async (c) => {
  const { id } = c.req.param()
  const { userId, role } = c.get('user')

  const existingPost = await prisma.post.findUnique({
    where: { id },
  })

  if (!existingPost) {
    throw new NotFoundError('Post not found')
  }

  // Check if user is author or admin
  if (existingPost.authorId !== userId && role !== 'ADMIN') {
    throw new ForbiddenError('You can only delete your own posts')
  }

  await removePostFromIndex(id).catch((err) =>
    console.error('[semantic-search] remove from index failed:', err)
  )
  await removeEventsForSource('post', id).catch((err) =>
    console.error('[calendar-events] remove post event failed:', err)
  )
  await prisma.post.delete({
    where: { id },
  })

  return c.json({
    success: true,
    data: { message: 'Post deleted successfully' },
  })
})

export default posts
