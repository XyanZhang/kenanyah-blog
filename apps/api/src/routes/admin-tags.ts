import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { adminAuthMiddleware, requireAdminRole } from '../middleware/admin-auth'
import { validateBody } from '../middleware/validation'
import { ConflictError, NotFoundError } from '../middleware/error'
import {
  createTagSchema,
  updateTagSchema,
  type CreateTagInput,
  type UpdateTagInput,
} from '@blog/validation'
import { generateSlug } from '@blog/utils'

type AdminTagVariables = {
  validatedBody: unknown
}

const adminTags = new Hono<{ Variables: AdminTagVariables }>()

adminTags.use('*', adminAuthMiddleware, requireAdminRole('ADMIN'))

adminTags.get('/', async (c) => {
  const items = await prisma.tag.findMany({
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

adminTags.post('/', validateBody(createTagSchema), async (c) => {
  const data = c.get('validatedBody') as CreateTagInput
  const slug = generateSlug(data.name)
  const existing = await prisma.tag.findUnique({ where: { slug } })
  if (existing) {
    throw new ConflictError('Tag with this name already exists')
  }
  const item = await prisma.tag.create({
    data: {
      name: data.name,
      slug,
    },
  })
  return c.json({ success: true, data: item }, 201)
})

adminTags.patch('/:id', validateBody(updateTagSchema), async (c) => {
  const { id } = c.req.param()
  const data = c.get('validatedBody') as UpdateTagInput
  const existing = await prisma.tag.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Tag not found')
  }
  const item = await prisma.tag.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.name ? generateSlug(data.name) : undefined,
    },
  })
  return c.json({ success: true, data: item })
})

adminTags.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const existing = await prisma.tag.findUnique({ where: { id } })
  if (!existing) {
    throw new NotFoundError('Tag not found')
  }
  await prisma.tag.delete({ where: { id } })
  return c.json({ success: true, data: { message: 'Tag deleted successfully' } })
})

export default adminTags
