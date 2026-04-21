import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { adminAuthMiddleware, requireAdminRole } from '../middleware/admin-auth'

const adminDashboard = new Hono()

const DAY_RANGE = 30
const ACTIVITY_LIMIT = 8

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

adminDashboard.get(
  '/',
  adminAuthMiddleware,
  requireAdminRole('ADMIN'),
  async (c) => {
    const today = startOfDay(new Date())
    const rangeStart = addDays(today, -(DAY_RANGE - 1))
    const rangeEnd = addDays(today, 1)
    const recentDraftThreshold = addDays(today, -7)

    const [
      totalPosts,
      draftPosts,
      pendingComments,
      approvedComments,
      categoryCount,
      tagCount,
      postsInRange,
      topCategories,
      recentPosts,
      recentComments,
      recentlyUpdatedDrafts,
    ] = await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { published: false } }),
      prisma.comment.count({ where: { approved: false } }),
      prisma.comment.count({ where: { approved: true } }),
      prisma.category.count(),
      prisma.tag.count(),
      prisma.post.findMany({
        where: {
          OR: [
            { createdAt: { gte: rangeStart, lt: rangeEnd } },
            { publishedAt: { gte: rangeStart, lt: rangeEnd } },
          ],
        },
        select: {
          id: true,
          createdAt: true,
          published: true,
          publishedAt: true,
        },
      }),
      prisma.category.findMany({
        take: 6,
        orderBy: {
          posts: {
            _count: 'desc',
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              posts: true,
            },
          },
        },
      }),
      prisma.post.findMany({
        take: ACTIVITY_LIMIT,
        orderBy: { updatedAt: 'desc' },
        include: {
          author: {
            select: {
              username: true,
              name: true,
            },
          },
        },
      }),
      prisma.comment.findMany({
        take: ACTIVITY_LIMIT,
        orderBy: { updatedAt: 'desc' },
        include: {
          author: {
            select: {
              username: true,
              name: true,
            },
          },
          post: {
            select: {
              title: true,
              slug: true,
            },
          },
        },
      }),
      prisma.post.count({
        where: {
          published: false,
          updatedAt: {
            gte: recentDraftThreshold,
          },
        },
      }),
    ])

    const trendMap = new Map(
      Array.from({ length: DAY_RANGE }, (_, index) => {
        const date = addDays(rangeStart, index)
        const isoDate = toIsoDate(date)
        return [
          isoDate,
          {
            date: isoDate,
            label: dayLabel(date),
            createdPosts: 0,
            publishedPosts: 0,
            draftPosts: 0,
          },
        ]
      })
    )

    for (const post of postsInRange) {
      const createdKey = toIsoDate(startOfDay(post.createdAt))
      const createdBucket = trendMap.get(createdKey)
      if (createdBucket) {
        createdBucket.createdPosts += 1
        if (!post.published) {
          createdBucket.draftPosts += 1
        }
      }

      if (post.publishedAt) {
        const publishedKey = toIsoDate(startOfDay(post.publishedAt))
        const publishedBucket = trendMap.get(publishedKey)
        if (publishedBucket) {
          publishedBucket.publishedPosts += 1
        }
      }
    }

    const publishingTrend = Array.from(trendMap.values())

    const recentActivity = [
      ...recentPosts.map((post) => ({
        id: `post-${post.id}`,
        type: 'post_updated' as const,
        title: post.title,
        description: `${post.author.name ?? post.author.username} updated this post`,
        timestamp: post.updatedAt,
        href: `/posts/${post.id}`,
      })),
      ...recentComments.map((comment) => ({
        id: `comment-${comment.id}`,
        type: comment.approved ? ('comment_approved' as const) : ('comment_pending' as const),
        title: comment.post.title,
        description: `${comment.author.name ?? comment.author.username} ${comment.approved ? 'approved a comment' : 'left a comment pending review'}`,
        timestamp: comment.updatedAt,
        href: `/comments`,
      })),
    ]
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
      .slice(0, ACTIVITY_LIMIT)

    return c.json({
      success: true,
      data: {
        kpis: {
          totalPosts,
          draftPosts,
          pendingComments,
          categoryCount,
          tagCount,
        },
        publishingTrend,
        publishingBreakdown: publishingTrend,
        commentModeration: {
          pending: pendingComments,
          approved: approvedComments,
        },
        categoryDistribution: topCategories.map((category) => ({
          id: category.id,
          label: category.name,
          slug: category.slug,
          value: category._count.posts,
        })),
        recentActivity,
        actionItems: [
          {
            id: 'pending-comments',
            label: 'Pending comments',
            value: pendingComments,
            tone: 'warning' as const,
            description: 'Comments waiting for review now.',
          },
          {
            id: 'draft-posts',
            label: 'Draft posts',
            value: draftPosts,
            tone: 'default' as const,
            description: 'Content pieces not published yet.',
          },
          {
            id: 'recent-drafts',
            label: 'Updated drafts',
            value: recentlyUpdatedDrafts,
            tone: 'success' as const,
            description: 'Drafts edited within the last 7 days.',
          },
        ],
      },
    })
  }
)

export default adminDashboard
