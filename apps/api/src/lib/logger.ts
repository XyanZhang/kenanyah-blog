/**
 * 日志收集：基于 pino 的结构化日志
 * - 开发环境：pino-pretty 输出可读格式
 * - 生产环境：JSON 输出，便于 ELK/Datadog 等收集
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pino from 'pino'
import { env } from '../env'

const isDev = env.NODE_ENV === 'development'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const logFilePath =
  env.LOG_FILE_PATH || path.resolve(__dirname, '..', '..', 'logs', `${env.NODE_ENV || 'development'}.log`)

const baseOptions: pino.LoggerOptions = {
  level: env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  formatters: {
    level: (label) => ({ level: label }),
  },
}

const streams: pino.StreamEntry[] = [
  {
    stream: pino.destination({
      dest: logFilePath,
      append: true,
      mkdir: true,
      sync: false,
    }),
  },
]

if (isDev) {
  streams.push({
    stream: pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      },
    }),
  })
} else {
  streams.push({
    stream: pino.destination(1),
  })
}

export const logger = pino(baseOptions, pino.multistream(streams))
