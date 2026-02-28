import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { authMiddleware, requireRole } from '../middleware/auth'
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

const posts = new Hono()

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

// Get post by slug
posts.get('/:slug', async (c) => {
  const { slug } = c.req.param()

  const post = await prisma.post.findUnique({
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

  const slug = generateSlug(data.title)

  // Check if slug already exists
  const existingPost = await prisma.post.findUnique({
    where: { slug },
  })

  if (existingPost) {
    // Append timestamp to make it unique
    const uniqueSlug = `${slug}-${Date.now()}`
    data.slug = uniqueSlug
  } else {
    data.slug = slug
  }

  const post = await prisma.post.create({
    data: {
      slug: data.slug,
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
    updateData.slug = generateSlug(data.title)
  }
  if (data.excerpt !== undefined) updateData.excerpt = data.excerpt
  if (data.content) updateData.content = data.content
  if (data.coverImage !== undefined) updateData.coverImage = data.coverImage
  if (data.published !== undefined) {
    updateData.published = data.published
    if (data.published) {
      updateData.publishedAt = data.publishedAt
        ? new Date(data.publishedAt)
        : existingPost.publishedAt ?? new Date()
    } else {
      updateData.publishedAt = null
    }
  }
  if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured

  const post = await prisma.post.update({
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

  indexPost(post.id).catch((err) =>
    console.error('[semantic-search] index post failed:', err)
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
  await prisma.post.delete({
    where: { id },
  })

  return c.json({
    success: true,
    data: { message: 'Post deleted successfully' },
  })
})

export default posts
