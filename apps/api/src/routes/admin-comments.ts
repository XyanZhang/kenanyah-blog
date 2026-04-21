import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { adminAuthMiddleware, requireAdminRole } from '../middleware/admin-auth'
import { validateBody, validateQuery } from '../middleware/validation'
import { NotFoundError } from '../middleware/error'
import {
  adminCommentModerationSchema,
  adminCommentQuerySchema,
  type AdminCommentModerationInput,
  type AdminCommentQueryInput,
} from '@blog/validation'

type AdminCommentVariables = {
  validatedQuery: unknown
  validatedBody: unknown
}

const adminComments = new Hono<{ Variables: AdminCommentVariables }>()

adminComments.get(
  '/',
  adminAuthMiddleware,
  requireAdminRole('ADMIN'),
  validateQuery(adminCommentQuerySchema),
  async (c) => {
    const query = c.get('validatedQuery') as AdminCommentQueryInput
    const page = query.page || 1
    const limit = query.limit || 10
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = {}

    if (query.approved !== 'all') {
      where.approved = query.approved === 'true'
    }
    if (query.search) {
      where.OR = [
        { content: { contains: query.search, mode: 'insensitive' } },
        { post: { title: { contains: query.search, mode: 'insensitive' } } },
        { author: { username: { contains: query.search, mode: 'insensitive' } } },
      ]
    }

    const [total, comments] = await Promise.all([
      prisma.comment.count({ where }),
      prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          author: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
            },
          },
        },
      }),
    ])

    return c.json({
      success: true,
      data: comments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  }
)

adminComments.patch(
  '/:id/moderate',
  adminAuthMiddleware,
  requireAdminRole('ADMIN'),
  validateBody(adminCommentModerationSchema),
  async (c) => {
    const { id } = c.req.param()
    const data = c.get('validatedBody') as AdminCommentModerationInput
    const existing = await prisma.comment.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundError('Comment not found')
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: { approved: data.approved },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        author: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
          },
        },
      },
    })

    return c.json({ success: true, data: comment })
  }
)

export default adminComments
