import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { authMiddleware, requireRole } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import {
  createTagSchema,
  updateTagSchema,
  type CreateTagInput,
  type UpdateTagInput,
} from '@blog/validation'
import { generateSlug } from '@blog/utils'
import { NotFoundError, ConflictError } from '../middleware/error'

type TagVariables = {
  validatedBody: unknown
  user: { userId: string; role: string }
}

const tags = new Hono<{ Variables: TagVariables }>()

// List all tags
tags.get('/', async (c) => {
  const tagsList = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  })

  return c.json({
    success: true,
    data: tagsList,
  })
})

// Get tag by slug
tags.get('/:slug', async (c) => {
  const { slug } = c.req.param()

  const tag = await prisma.tag.findUnique({
    where: { slug },
    include: {
      posts: {
        include: {
          post: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  avatar: true,
                },
              },
              _count: {
                select: {
                  comments: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!tag) {
    throw new NotFoundError('Tag not found')
  }

  return c.json({
    success: true,
    data: tag,
  })
})

// Create tag (admin only)
tags.post(
  '/',
  authMiddleware,
  requireRole('ADMIN'),
  validateBody(createTagSchema),
  async (c) => {
    const data = c.get('validatedBody') as CreateTagInput

    const slug = generateSlug(data.name)

    // Check if slug already exists
    const existingTag = await prisma.tag.findUnique({
      where: { slug },
    })

    if (existingTag) {
      throw new ConflictError('Tag with this name already exists')
    }

    const tag = await prisma.tag.create({
      data: {
        slug,
        name: data.name,
      },
    })

    return c.json(
      {
        success: true,
        data: tag,
      },
      201
    )
  }
)

// Update tag (admin only)
tags.patch(
  '/:id',
  authMiddleware,
  requireRole('ADMIN'),
  validateBody(updateTagSchema),
  async (c) => {
    const { id } = c.req.param()
    const data = c.get('validatedBody') as UpdateTagInput

    const existingTag = await prisma.tag.findUnique({
      where: { id },
    })

    if (!existingTag) {
      throw new NotFoundError('Tag not found')
    }

    const updateData: { name?: string; slug?: string } = {}
    if (data.name !== undefined) {
      updateData.name = data.name
      updateData.slug = generateSlug(data.name)
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
    })

    return c.json({
      success: true,
      data: tag,
    })
  }
)

// Delete tag (admin only)
tags.delete('/:id', authMiddleware, requireRole('ADMIN'), async (c) => {
  const { id } = c.req.param()

  const existingTag = await prisma.tag.findUnique({
    where: { id },
  })

  if (!existingTag) {
    throw new NotFoundError('Tag not found')
  }

  await prisma.tag.delete({
    where: { id },
  })

  return c.json({
    success: true,
    data: { message: 'Tag deleted successfully' },
  })
})

export default tags
