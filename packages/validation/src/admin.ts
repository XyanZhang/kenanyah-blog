import { z } from 'zod'

export const adminLoginSchema = z.object({
  email: z.string().email('请输入有效邮箱'),
  password: z.string().min(6, '密码至少 6 位'),
})

export const adminPostQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().max(100).optional(),
  published: z.enum(['true', 'false', 'all']).default('all'),
  featured: z.enum(['true', 'false', 'all']).default('all'),
})

export const adminPostUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(500).nullable().optional(),
  coverImage: z.string().url().nullable().optional(),
  published: z.boolean().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  isFeatured: z.boolean().optional(),
  categoryIds: z.array(z.string().cuid()).optional(),
  tagIds: z.array(z.string().cuid()).optional(),
})

export const adminCommentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  approved: z.enum(['true', 'false', 'all']).default('all'),
  search: z.string().max(100).optional(),
})

export const adminCommentModerationSchema = z.object({
  approved: z.boolean(),
})

export const adminMediaQuerySchema = z.object({
  subdir: z.string().max(64).optional(),
  search: z.string().max(100).optional(),
  type: z.enum(['all', 'image', 'pdf', 'other']).default('all'),
  source: z.string().max(64).optional(),
  status: z.string().max(64).optional(),
})

export const adminBookmarkQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  source: z.enum(['browser_extension', 'manual', 'api', 'all']).default('all'),
})

export const adminThoughtQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(100).optional(),
})

export const adminThoughtCreateSchema = z.object({
  content: z.string().min(1).max(20000),
  images: z.array(z.string().min(1)).max(20).optional(),
  likeCount: z.number().int().min(0).optional(),
  commentCount: z.number().int().min(0).optional(),
})

export const adminThoughtUpdateSchema = adminThoughtCreateSchema.partial()

export const adminProjectQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(100).optional(),
  status: z.enum(['planned', 'active', 'completed', 'archived', 'all']).default('all'),
  category: z.string().max(100).optional(),
})

export const adminProjectCreateSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(5000).nullable().optional(),
  href: z.string().url().nullable().optional(),
  coverImage: z.string().url().nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  tags: z.array(z.string().min(1).max(30)).max(10).optional(),
  status: z.enum(['planned', 'active', 'completed', 'archived']).default('active'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export const adminProjectUpdateSchema = adminProjectCreateSchema.partial()

const mediaUrlSchema = z
  .string()
  .refine((value) => value.startsWith('/uploads/') || z.string().url().safeParse(value).success, {
    message: '请输入有效图片地址',
  })

export const adminPhotoQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(100).optional(),
  hasImage: z.enum(['true', 'false', 'all']).default('all'),
})

export const adminPhotoCreateSchema = z.object({
  title: z.string().max(120).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  imageUrl: mediaUrlSchema.nullable().optional(),
  mediaAssetId: z.string().cuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export const adminPhotoUpdateSchema = adminPhotoCreateSchema.partial()

export type AdminLoginInput = z.infer<typeof adminLoginSchema>
export type AdminPostQueryInput = z.infer<typeof adminPostQuerySchema>
export type AdminPostUpdateInput = z.infer<typeof adminPostUpdateSchema>
export type AdminCommentQueryInput = z.infer<typeof adminCommentQuerySchema>
export type AdminCommentModerationInput = z.infer<typeof adminCommentModerationSchema>
export type AdminMediaQueryInput = z.infer<typeof adminMediaQuerySchema>
export type AdminBookmarkQueryInput = z.infer<typeof adminBookmarkQuerySchema>
export type AdminThoughtQueryInput = z.infer<typeof adminThoughtQuerySchema>
export type AdminThoughtCreateInput = z.infer<typeof adminThoughtCreateSchema>
export type AdminThoughtUpdateInput = z.infer<typeof adminThoughtUpdateSchema>
export type AdminProjectQueryInput = z.infer<typeof adminProjectQuerySchema>
export type AdminProjectCreateInput = z.infer<typeof adminProjectCreateSchema>
export type AdminProjectUpdateInput = z.infer<typeof adminProjectUpdateSchema>
export type AdminPhotoQueryInput = z.infer<typeof adminPhotoQuerySchema>
export type AdminPhotoCreateInput = z.infer<typeof adminPhotoCreateSchema>
export type AdminPhotoUpdateInput = z.infer<typeof adminPhotoUpdateSchema>
