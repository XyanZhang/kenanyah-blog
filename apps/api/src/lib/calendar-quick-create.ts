import type { EventSourceType, EventStatus } from '../generated/prisma/client/client'

export const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

export function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function dateStringToUtcDate(value: string): Date {
  if (!DATE_ONLY_RE.test(value)) {
    throw new Error('无效日期')
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) {
    throw new Error('无效日期')
  }

  return date
}

function stripDateHints(raw: string): string {
  return raw
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b\d{4}\/\d{2}\/\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}月\d{1,2}日\b/g, ' ')
    .replace(/今天|明天|后天|昨天|前天/g, ' ')
    .replace(/[，。？！!?,;；]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 120)
}

export function extractTitle(rawText: string, sourceType: EventSourceType): string {
  const text = stripDateHints(rawText)
  const colonMatch = text.match(/[：:]\s*(.+)$/)
  if (colonMatch?.[1]) {
    return normalizeTitle(colonMatch[1])
  }

  const patterns: Array<[EventSourceType, RegExp]> = [
    ['post', /(?:写|发|发布|新建|创建)(?:一篇|篇)?(?:博客|文章|博文)?\s*(.+)/],
    ['thought', /(?:记录|新增|写下|发布)(?:一条|个)?(?:想法|思考|念头)?\s*(.+)/],
    ['project', /(?:创建|新建|启动|做)(?:一个|个)?(?:项目|作品)?\s*(.+)/],
    ['photo', /(?:新增|上传|记录)(?:一张|组)?(?:照片|图片|相片)?\s*(.+)/],
    ['manual', /(?:记录|安排|提醒|计划)\s*(.+)/],
    ['system', /(.+)/],
  ]

  const pattern = patterns.find(([type]) => type === sourceType)?.[1]
  const matched = pattern ? text.match(pattern) : null
  const candidate = matched?.[1] ?? text
  const cleaned = candidate
    .replace(/^(一下|一条|一个|一篇)\s*/, '')
    .replace(/^(博客|文章|想法|思考|项目|照片|事件)\s*/, '')
    .trim()

  return normalizeTitle(cleaned || rawText)
}

export function inferSourceType(rawText: string): EventSourceType {
  if (/(博客|文章|博文)/.test(rawText)) return 'post'
  if (/(想法|思考|念头|灵感)/.test(rawText)) return 'thought'
  if (/(项目|作品)/.test(rawText)) return 'project'
  if (/(照片|图片|相片|摄影)/.test(rawText)) return 'photo'
  return 'manual'
}

export function parseExplicitDate(rawText: string, now: Date): string | null {
  const isoMatch = rawText.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (isoMatch?.[1]) return isoMatch[1]

  const slashMatch = rawText.match(/\b(\d{4})\/(\d{2})\/(\d{2})\b/)
  if (slashMatch) {
    return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`
  }

  const zhMatch = rawText.match(/(\d{1,2})月(\d{1,2})日/)
  if (zhMatch) {
    const year = now.getUTCFullYear()
    const month = zhMatch[1].padStart(2, '0')
    const day = zhMatch[2].padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const base = dateStringToUtcDate(toDateString(now))
  const offsetMap = new Map<string, number>([
    ['今天', 0],
    ['明天', 1],
    ['后天', 2],
    ['昨天', -1],
    ['前天', -2],
  ])

  for (const [keyword, offset] of offsetMap.entries()) {
    if (rawText.includes(keyword)) {
      return toDateString(new Date(base.getTime() + offset * 24 * 60 * 60 * 1000))
    }
  }

  return null
}

export function inferStatus(
  rawText: string,
  sourceType: EventSourceType,
  targetDate: string,
  now: Date
): EventStatus {
  if (/已经|已|完成了|做完了|发了|发布了|记录了|新增了|创建了/.test(rawText)) {
    return 'completed'
  }

  if (sourceType === 'post') {
    return 'planned'
  }

  if (/计划|准备|待办|提醒|安排|要|想在/.test(rawText)) {
    return 'planned'
  }

  if (targetDate > toDateString(now)) {
    return 'planned'
  }

  if (sourceType === 'thought' || sourceType === 'photo') {
    return 'completed'
  }

  return 'completed'
}
