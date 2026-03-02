import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { authMiddleware, requireRole } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@blog/validation'
import { generateSlug } from '@blog/utils'
import { NotFoundError, ConflictError } from '../middleware/error'

const categories = new Hono()

// List all categories
categories.get('/', async (c) => {
  const categoriesList = await prisma.category.findMany({
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
    data: categoriesList,
  })
})

// Get category by slug
categories.get('/:slug', async (c) => {
  const { slug } = c.req.param()

  const category = await prisma.category.findUnique({
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

  if (!category) {
    throw new NotFoundError('Category not found')
  }

  return c.json({
    success: true,
    data: category,
  })
})

// Create category (admin only)
categories.post(
  '/',
  authMiddleware,
  requireRole('ADMIN'),
  validateBody(createCategorySchema),
  async (c) => {
    const data = c.get('validatedBody') as CreateCategoryInput

    const slug = generateSlug(data.name)

    // Check if slug already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug },
    })

    if (existingCategory) {
      throw new ConflictError('Category with this name already exists')
    }

    const category = await prisma.category.create({
      data: {
        slug,
        name: data.name,
        description: data.description,
      },
    })

    return c.json(
      {
        success: true,
        data: category,
      },
      201
    )
  }
)

// Update category (admin only)
categories.patch(
  '/:id',
  authMiddleware,
  requireRole('ADMIN'),
  validateBody(updateCategorySchema),
  async (c) => {
    const { id } = c.req.param()
    const data = c.get('validatedBody') as UpdateCategoryInput

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    })

    if (!existingCategory) {
      throw new NotFoundError('Category not found')
    }

    const updateData: any = {}

    if (data.name) {
      updateData.name = data.name
      updateData.slug = generateSlug(data.name)
    }
    if (data.description !== undefined) {
      updateData.description = data.description
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    })

    return c.json({
      success: true,
      data: category,
    })
  }
)

// Delete category (admin only)
categories.delete('/:id', authMiddleware, requireRole('ADMIN'), async (c) => {
  const { id } = c.req.param()

  const existingCategory = await prisma.category.findUnique({
    where: { id },
  })

  if (!existingCategory) {
    throw new NotFoundError('Category not found')
  }

  await prisma.category.delete({
    where: { id },
  })

  return c.json({
    success: true,
    data: { message: 'Category deleted successfully' },
  })
})

export default categories
