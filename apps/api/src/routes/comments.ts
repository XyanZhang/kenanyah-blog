import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { authMiddleware, requireRole } from '../middleware/auth'
import { validateBody } from '../middleware/validation'
import {
  createCommentSchema,
  updateCommentSchema,
  type CreateCommentInput,
  type UpdateCommentInput,
} from '@blog/validation'
import { NotFoundError, ForbiddenError } from '../middleware/error'

const comments = new Hono()

// Get comments for a post
comments.get('/post/:postId', async (c) => {
  const { postId } = c.req.param()

  const commentsList = await prisma.comment.findMany({
    where: {
      postId,
      parentId: null, // Only top-level comments
      approved: true,
    },
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
      replies: {
        where: { approved: true },
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
            },
          },
        },
      },
    },
  })

  return c.json({
    success: true,
    data: commentsList,
  })
})

// Create comment
comments.post('/', authMiddleware, validateBody(createCommentSchema), async (c) => {
  const data = c.get('validatedBody') as CreateCommentInput
  const { userId } = c.get('user')

  // Check if post exists
  const post = await prisma.post.findUnique({
    where: { id: data.postId },
  })

  if (!post) {
    throw new NotFoundError('Post not found')
  }

  // If replying to a comment, check if parent exists
  if (data.parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: data.parentId },
    })

    if (!parentComment) {
      throw new NotFoundError('Parent comment not found')
    }
  }

  const comment = await prisma.comment.create({
    data: {
      content: data.content,
      postId: data.postId,
      authorId: userId,
      parentId: data.parentId,
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
    },
  })

  return c.json(
    {
      success: true,
      data: comment,
    },
    201
  )
})

// Update comment
comments.patch('/:id', authMiddleware, validateBody(updateCommentSchema), async (c) => {
  const { id } = c.req.param()
  const data = c.get('validatedBody') as UpdateCommentInput
  const { userId, role } = c.get('user')

  const existingComment = await prisma.comment.findUnique({
    where: { id },
  })

  if (!existingComment) {
    throw new NotFoundError('Comment not found')
  }

  // Check if user is author or admin
  if (existingComment.authorId !== userId && role !== 'ADMIN') {
    throw new ForbiddenError('You can only edit your own comments')
  }

  const comment = await prisma.comment.update({
    where: { id },
    data: {
      content: data.content,
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
    },
  })

  return c.json({
    success: true,
    data: comment,
  })
})

// Delete comment
comments.delete('/:id', authMiddleware, async (c) => {
  const { id } = c.req.param()
  const { userId, role } = c.get('user')

  const existingComment = await prisma.comment.findUnique({
    where: { id },
  })

  if (!existingComment) {
    throw new NotFoundError('Comment not found')
  }

  // Check if user is author or admin
  if (existingComment.authorId !== userId && role !== 'ADMIN') {
    throw new ForbiddenError('You can only delete your own comments')
  }

  await prisma.comment.delete({
    where: { id },
  })

  return c.json({
    success: true,
    data: { message: 'Comment deleted successfully' },
  })
})

// Approve/reject comment (admin only)
comments.patch('/:id/approve', authMiddleware, requireRole('ADMIN', 'MODERATOR'), async (c) => {
  const { id } = c.req.param()
  const { approved } = await c.req.json()

  const existingComment = await prisma.comment.findUnique({
    where: { id },
  })

  if (!existingComment) {
    throw new NotFoundError('Comment not found')
  }

  const comment = await prisma.comment.update({
    where: { id },
    data: { approved },
    include: {
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

  return c.json({
    success: true,
    data: comment,
  })
})

export default comments
