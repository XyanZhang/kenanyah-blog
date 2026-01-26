import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { authMiddleware } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import {
  updateUserSchema,
  type UpdateUserInput,
} from '@blog/validation'
import { NotFoundError, ForbiddenError } from '../middleware/error'

const users = new Hono()

// Get user by username
users.get('/:username', async (c) => {
  const { username } = c.req.param()

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      avatar: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          posts: true,
          comments: true,
        },
      },
    },
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  return c.json({
    success: true,
    data: user,
  })
})

// Get user's posts
users.get('/:username/posts', async (c) => {
  const { username } = c.req.param()

  const user = await prisma.user.findUnique({
    where: { username },
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  const posts = await prisma.post.findMany({
    where: {
      authorId: user.id,
      published: true,
    },
    orderBy: { createdAt: 'desc' },
    include: {
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

  return c.json({
    success: true,
    data: posts,
  })
})

// Update user profile
users.patch('/:id', authMiddleware, validateBody(updateUserSchema), async (c) => {
  const { id } = c.req.param()
  const data = c.get('validatedBody') as UpdateUserInput
  const { userId, role } = c.get('user')

  // Check if user is updating their own profile or is admin
  if (userId !== id && role !== 'ADMIN') {
    throw new ForbiddenError('You can only update your own profile')
  }

  const existingUser = await prisma.user.findUnique({
    where: { id },
  })

  if (!existingUser) {
    throw new NotFoundError('User not found')
  }

  const updateData: any = {}

  if (data.name !== undefined) updateData.name = data.name
  if (data.bio !== undefined) updateData.bio = data.bio
  if (data.avatar !== undefined) updateData.avatar = data.avatar

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      bio: true,
      avatar: true,
      role: true,
      createdAt: true,
    },
  })

  return c.json({
    success: true,
    data: user,
  })
})

export default users
