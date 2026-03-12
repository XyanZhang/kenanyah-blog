/**
 * 验证码服务：生成、发送、验证
 * - 6位数字验证码
 * - 10分钟有效期
 * - 5次尝试限制
 * - 60秒发送冷却
 */
import { prisma } from './db'
import { env } from '../env'
import { sendEmail, generateVerificationEmailHtml, isSmtpConfigured } from './email'
import { BadRequestError, TooManyRequestsError } from '../middleware/error'

export type VerificationCodeType = 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD'

interface CreateCodeOptions {
  email: string
  type: VerificationCodeType
}

interface VerifyCodeOptions {
  email: string
  code: string
  type: VerificationCodeType
}

// 内存存储发送频率限制（生产环境建议使用 Redis）
interface RateLimitState {
  lastSentAt: Date | null
  dailyCount: number
}
const sendRateLimitStore = new Map<string, RateLimitState>()

// 生成数字验证码
function generateCode(length: number): string {
  const digits = '0123456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * digits.length)]
  }
  return code
}

// 检查发送频率限制
function checkSendRateLimit(email: string): void {
  const state = sendRateLimitStore.get(email)
  const now = new Date()
  const cooldownSeconds = parseInt(env.VERIFICATION_CODE_RESEND_COOLDOWN_SECONDS)

  if (state?.lastSentAt) {
    const elapsed = (now.getTime() - state.lastSentAt.getTime()) / 1000
    if (elapsed < cooldownSeconds) {
      const remaining = Math.ceil(cooldownSeconds - elapsed)
      throw new TooManyRequestsError(`请等待 ${remaining} 秒后再次发送`)
    }
  }
}

// 更新发送状态
function updateSendRateLimit(email: string): void {
  const state = sendRateLimitStore.get(email)
  sendRateLimitStore.set(email, {
    lastSentAt: new Date(),
    dailyCount: (state?.dailyCount || 0) + 1,
  })
}

// 发送验证码
export async function createAndSendVerificationCode(
  options: CreateCodeOptions
): Promise<{ success: boolean; cooldownSeconds: number }> {
  const { email, type } = options
  const codeLength = parseInt(env.VERIFICATION_CODE_LENGTH)
  const expiryMinutes = parseInt(env.VERIFICATION_CODE_EXPIRY_MINUTES)
  const cooldownSeconds = parseInt(env.VERIFICATION_CODE_RESEND_COOLDOWN_SECONDS)

  // 检查 SMTP 配置
  if (!isSmtpConfigured()) {
    throw new BadRequestError('邮件服务未配置，请联系管理员')
  }

  // 检查发送频率
  checkSendRateLimit(email)

  // 使旧验证码失效
  await prisma.verificationCode.updateMany({
    where: {
      email,
      type,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { usedAt: new Date() },
  })

  // 生成新验证码
  const code = generateCode(codeLength)
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000)

  await prisma.verificationCode.create({
    data: {
      email,
      code,
      type,
      expiresAt,
    },
  })

  // 发送邮件
  const html = generateVerificationEmailHtml(code, expiryMinutes)
  await sendEmail({
    to: email,
    subject: '您的登录验证码',
    html,
  })

  // 更新发送状态
  updateSendRateLimit(email)

  return { success: true, cooldownSeconds }
}

// 验证验证码
export async function verifyCode(options: VerifyCodeOptions): Promise<{ valid: boolean; error?: string }> {
  const { email, code, type } = options
  const maxAttempts = parseInt(env.VERIFICATION_CODE_MAX_ATTEMPTS)

  const record = await prisma.verificationCode.findFirst({
    where: {
      email,
      type,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) {
    return { valid: false, error: '验证码已过期或不存在，请重新获取' }
  }

  // 检查尝试次数
  if (record.attempts >= maxAttempts) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    })
    return { valid: false, error: '验证尝试次数过多，请重新获取验证码' }
  }

  // 验证码匹配
  if (record.code !== code) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    const remaining = maxAttempts - record.attempts - 1
    return {
      valid: false,
      error: `验证码错误，剩余 ${remaining} 次尝试机会`,
    }
  }

  // 标记为已使用
  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  })

  return { valid: true }
}

// 清理过期验证码（定时任务可调用）
export async function cleanupExpiredCodes(): Promise<number> {
  const result = await prisma.verificationCode.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
    },
  })
  return result.count
}