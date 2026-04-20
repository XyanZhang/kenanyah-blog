import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { z } from 'zod'

// 如果 process.env 中已有配置（如通过 --env-file 加载），则不重复加载
// 否则尝试加载 apps/api/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url))
if (!process.env.DATABASE_URL) {
  config({ path: path.resolve(__dirname, '..', '.env') })
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_REDIRECT_URI: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  // LLM：若 Key 以 cr_ 开头多为代理 Key，需用代理的 BASE_URL，不能填 api.deepseek.com
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().url().optional(), // 直连 DeepSeek: https://api.deepseek.com；代理则填代理提供的 base URL
  OPENAI_MODEL: z.string().default('gpt-4o-mini'), // DeepSeek 直连: deepseek-chat
  // 按用途可选覆盖（provider + model）：fast/reasoning/default
  OPENAI_API_KEY_DEFAULT: z.string().min(1).optional(),
  OPENAI_BASE_URL_DEFAULT: z.string().url().optional(),
  OPENAI_MODEL_DEFAULT: z.string().optional(),
  OPENAI_API_KEY_FAST: z.string().min(1).optional(),
  OPENAI_BASE_URL_FAST: z.string().url().optional(),
  OPENAI_MODEL_FAST: z.string().optional(),
  OPENAI_API_KEY_REASONING: z.string().min(1).optional(),
  OPENAI_BASE_URL_REASONING: z.string().url().optional(),
  OPENAI_MODEL_REASONING: z.string().optional(),
  /**
   * 文本聊天厂商路由（按用途槽位）：openai = 走 OPENAI_*；qwen = 走 DashScope 兼容模式 + DASHSCOPE_API_KEY。
   * Agent 也可在 invokeChat/streamChat 里传 options.provider 覆盖。
   */
  LLM_PROVIDER_DEFAULT: z.enum(['openai', 'qwen']).default('openai'),
  LLM_PROVIDER_FAST: z.enum(['openai', 'qwen']).optional(),
  LLM_PROVIDER_REASONING: z.enum(['openai', 'qwen']).optional(),
  // 语义搜索：Embedding 模型（需与 OpenAI 兼容接口，如 text-embedding-3-small）
  EMBEDDINGS_BASE_URL: z.string().url().optional(),
  EMBEDDINGS_API_KEY: z.string().min(1).optional(),
  EMBEDDINGS_MODEL_NAME: z.string().default('text-embedding-v4'),
  // 封面图生成：阿里云 DashScope qwen-image-2.0-pro
  DASHSCOPE_API_KEY: z.string().min(1).optional(),
  DASHSCOPE_BASE_URL: z
    .string()
    .url()
    .optional()
    .default('https://dashscope.aliyuncs.com'), // 北京地域；新加坡用 https://dashscope-intl.aliyuncs.com
  /** DashScope 兼容 OpenAI 模式的文本模型（qwen-turbo / qwen-plus 等），按用途可细分 */
  DASHSCOPE_CHAT_MODEL: z.string().default('qwen-turbo'),
  DASHSCOPE_CHAT_MODEL_FAST: z.string().optional(),
  DASHSCOPE_CHAT_MODEL_REASONING: z.string().optional(),
  // 上传文件存储：本地 upload 目录，后续可切换 OSS
  UPLOAD_DIR: z.string().optional(), // 绝对路径，默认 apps/api/uploads
  STATICS_DIR: z.string().optional(), // 绝对路径，默认 apps/api/statics
  UPLOAD_BASE_URL: z
    .string()
    .url()
    .optional(), // 访问 URL 前缀，默认 http://localhost:${PORT}；OSS 时填 CDN 域名
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
  LOG_FILE_PATH: z.string().optional(),
  // SMTP 邮件服务配置
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.string().default('587'),
  SMTP_SECURE: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM: z.string().optional(), // 发件人地址，默认使用 SMTP_USER
  // 验证码配置
  VERIFICATION_CODE_LENGTH: z.string().default('6'),
  VERIFICATION_CODE_EXPIRY_MINUTES: z.string().default('10'),
  VERIFICATION_CODE_MAX_ATTEMPTS: z.string().default('5'),
  VERIFICATION_CODE_RESEND_COOLDOWN_SECONDS: z.string().default('60'),
})

export type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
  try {
    const envConfig = envSchema.parse(process.env)
    return envConfig
  } catch (error) {
    console.error('Environment validation failed:', error)
    throw new Error('Invalid environment variables')
  }
}

export const env = validateEnv()
