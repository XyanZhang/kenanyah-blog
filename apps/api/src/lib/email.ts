/**
 * 邮件服务：基于 nodemailer + SMTP
 * - 支持 TLS 加密传输
 * - 验证码邮件模板
 */
import nodemailer from 'nodemailer'
import { env } from '../env'
import { logger } from './logger'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// 检查 SMTP 配置是否完整
export function isSmtpConfigured(): boolean {
  return !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)
}

// 创建 transporter（单例）
let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (!isSmtpConfigured()) {
      throw new Error('SMTP is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS.')
    }

    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT),
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  }
  return transporter
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!isSmtpConfigured()) {
    logger.warn({ to: options.to }, 'SMTP not configured, skipping email send')
    throw new Error('SMTP is not configured')
  }

  const tp = getTransporter()
  const from = env.SMTP_FROM || env.SMTP_USER

  await tp.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  })

  logger.info({ to: options.to, subject: options.subject }, 'Email sent')
}

// 验证码邮件模板
export function generateVerificationEmailHtml(code: string, expiryMinutes: number): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f9fafb; border-radius: 8px;">
      <div style="background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
        <h2 style="margin: 0 0 24px 0; color: #111827; font-size: 24px; font-weight: 600;">您的验证码</h2>
        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px;">请使用以下验证码完成登录，验证码有效期为 ${expiryMinutes} 分钟。</p>
        <div style="background-color: #f3f4f6; padding: 16px 24px; border-radius: 6px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827; font-family: 'Courier New', monospace;">${code}</span>
        </div>
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">如果您没有请求此验证码，请忽略此邮件。此验证码仅用于登录验证，请勿告诉他人。</p>
      </div>
      <p style="margin: 24px 0 0 0; text-align: center; color: #9ca3af; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
    </div>
  `
}