import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { adminAuthMiddleware, requireAdminRole } from '../middleware/admin-auth'
import { validateBody } from '../middleware/validation'
import { ConflictError, NotFoundError } from '../middleware/error'
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@blog/validation'
import { generateSlug } from '@blog/utils'

type AdminCategoryVariables = {
  validatedBody: unknown
}

const adminCategories = new Hono<{ Variables: AdminCategoryVariables }>()

adminCategories.use('*', adminAuthMiddleware, requireAdminRole('ADMIN'))

adminCategories.get('/', async (c) => {
  const items = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          posts: true,
        },
      },
    },
  })
  return c.json({ success: true, data: items })
})

adminCategories.post('/', validateBody(createCategorySchema), async (c) => {
  const data = c.get('validatedBody') as CreateCategoryInput
  const slug = generateSlug(data.name)
  const existing = await prisma.category.findUnique({ where: { slug } })
  if (existing) {
    throw new ConflictError('Category with this name already exists')
  }
  const item = await prisma.category.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
    },
  })
  return c.json({ success: true, data: item }, 201)
})

adminCategories.patch('/:id', validateBody(updateCategorySchema), async (c) => {
  const { id } = c.req.param()
  const data = c.get('validatedBody') as UpdateCategoryInput
  const existing = await prisma.category.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Category not found')
  }
  const item = await prisma.category.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.name ? generateSlug(data.name) : undefined,
      description: data.description,
    },
  })
  return c.json({ success: true, data: item })
})

adminCategories.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const existing = await prisma.category.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Category not found')
  }
  await prisma.category.delete({ where: { id } })
  return c.json({ success: true, data: { message: 'Category deleted successfully' } })
})

export default adminCategories
