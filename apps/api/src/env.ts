import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { z } from 'zod'

// 显式加载 apps/api/.env，避免从 monorepo 根目录或其它 cwd 启动时读不到配置
const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.resolve(__dirname, '..', '.env') })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_REDIRECT_URI: z.string().url().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  // LLM：若 Key 以 cr_ 开头多为代理 Key，需用代理的 BASE_URL，不能填 api.deepseek.com
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_BASE_URL: z.string().url().optional(), // 直连 DeepSeek: https://api.deepseek.com；代理则填代理提供的 base URL
  OPENAI_MODEL: z.string().default('gpt-4o-mini'), // DeepSeek 直连: deepseek-chat
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
