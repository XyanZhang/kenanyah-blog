import type { ThoughtPost } from './types'

const AVATAR = '/images/avatar/avatar-pink.png'

const MAX_ITEMS = 25

/** 生成一页模拟数据 */
export function fetchThoughtsPage(page: number, pageSize: number): ThoughtPost[] {
  const start = (page - 1) * pageSize
  const remaining = Math.max(0, MAX_ITEMS - start)
  const take = Math.min(pageSize, remaining)
  const posts: ThoughtPost[] = []
  for (let i = 0; i < take; i++) {
    const idx = start + i
    const date = new Date()
    date.setDate(date.getDate() - idx)
    posts.push({
      id: `thought-${idx}`,
      avatar: AVATAR,
      authorName: '我',
      date: date.toISOString().slice(0, 10),
      content: `这是第 ${idx + 1} 条思考。可以是一段文字，记录当下的想法、读书笔记或灵感。`,
      images:
        idx % 4 === 0
          ? []
          : idx % 4 === 1
            ? [`https://picsum.photos/seed/t${idx}a/400/300`]
            : idx % 4 === 2
              ? [
                  `https://picsum.photos/seed/t${idx}a/400/300`,
                  `https://picsum.photos/seed/t${idx}b/400/300`,
                  `https://picsum.photos/seed/t${idx}c/400/300`,
                ]
              : [
                  `https://picsum.photos/seed/t${idx}a/400/300`,
                  `https://picsum.photos/seed/t${idx}b/400/300`,
                ],
      likeCount: Math.floor(Math.random() * 20),
      commentCount: Math.floor(Math.random() * 10),
    })
  }
  return posts
}
