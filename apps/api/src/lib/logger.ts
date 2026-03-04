/**
 * 日志收集：基于 pino 的结构化日志
 * - 开发环境：pino-pretty 输出可读格式
 * - 生产环境：JSON 输出，便于 ELK/Datadog 等收集
 */
import pino from 'pino'
import { env } from '../env'

const isDev = env.NODE_ENV === 'development'

export const logger = pino({
  level: env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          },
        },
      }
    : {
        formatters: {
          level: (label) => ({ level: label }),
        },
      }),
})
