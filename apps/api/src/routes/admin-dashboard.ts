import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { adminAuthMiddleware, requireAdminRole } from '../middleware/admin-auth'

const adminDashboard = new Hono()

adminDashboard.get(
  '/',
  adminAuthMiddleware,
  requireAdminRole('ADMIN'),
  async (c) => {
    const [totalPosts, draftPosts, pendingComments, categoryCount, tagCount, recentPosts] = await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { published: false } }),
      prisma.comment.count({ where: { approved: false } }),
      prisma.category.count(),
      prisma.tag.count(),
      prisma.post.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
      }),
    ])

    return c.json({
      success: true,
      data: {
        stats: {
          totalPosts,
          draftPosts,
          pendingComments,
          categoryCount,
          tagCount,
        },
        recentPosts,
      },
    })
  }
)

export default adminDashboard
