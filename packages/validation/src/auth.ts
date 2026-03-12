import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(1).max(100).optional(),
})

// 发送验证码
export const sendCodeSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
})

// 验证码登录
export const verifyCodeSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  code: z
    .string()
    .length(6, '验证码必须是 6 位数字')
    .regex(/^\d+$/, '验证码只能包含数字'),
})

// 完善用户信息（新用户首次登录）
export const setupProfileSchema = z.object({
  username: z
    .string()
    .min(3, '用户名至少 3 个字符')
    .max(30, '用户名最多 30 个字符')
    .regex(/^[a-zA-Z0-9_-]+$/, '用户名只能包含字母、数字、下划线和连字符'),
  password: z
    .string()
    .min(8, '密码至少 8 个字符')
    .regex(/[A-Z]/, '密码必须包含至少一个大写字母')
    .regex(/[a-z]/, '密码必须包含至少一个小写字母')
    .regex(/[0-9]/, '密码必须包含至少一个数字'),
  name: z.string().min(1).max(100).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type SendCodeInput = z.infer<typeof sendCodeSchema>
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>
export type SetupProfileInput = z.infer<typeof setupProfileSchema>
