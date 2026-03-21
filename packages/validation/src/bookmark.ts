import { z } from 'zod'

const bookmarkSourceSchema = z.enum(['browser_extension', 'manual', 'api'])

export const createBookmarkSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(500, '标题最多 500 字'),
  url: z.string().url('请填写有效 URL'),
  notes: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  source: bookmarkSourceSchema.optional(),
  favicon: z.string().max(500).optional(),
})

export const updateBookmarkSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  url: z.string().url().optional(),
  notes: z.string().max(2000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional().nullable(),
  favicon: z.string().max(500).optional().nullable(),
})

export const bookmarkSyncItemSchema = z.object({
  title: z.string().min(1).max(500),
  url: z.string().url(),
  notes: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  favicon: z.string().max(500).optional(),
})

export const bookmarkSyncSchema = z.object({
  items: z.array(bookmarkSyncItemSchema).min(1).max(100),
})

export type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>
export type UpdateBookmarkInput = z.infer<typeof updateBookmarkSchema>
export type BookmarkSyncItemInput = z.infer<typeof bookmarkSyncItemSchema>
export type BookmarkSyncInput = z.infer<typeof bookmarkSyncSchema>
