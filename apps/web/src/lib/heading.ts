export type TocHeading = {
  id: string
  depth: 2 | 3
  text: string
}

export const HEADING_SCROLL_OFFSET = 110

export function slugifyHeading(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function stripInlineMarkdown(text: string) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/(\*\*|__|\*|_|~~)/g, '')
    .replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function createHeadingIdMap() {
  return new Map<string, number>()
}

function nextHeadingId(idCounts: Map<string, number>, text: string) {
  const base = slugifyHeading(text) || 'section'
  const prev = idCounts.get(base) ?? 0
  idCounts.set(base, prev + 1)
  return prev === 0 ? base : `${base}-${prev + 1}`
}

export function createHeadingIdGenerator() {
  const idCounts = createHeadingIdMap()
  return (text: string) => nextHeadingId(idCounts, text)
}

export function scrollToHeadingById(id: string, options?: { behavior?: ScrollBehavior }) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false

  const target = document.getElementById(id)
  if (!target) return false

  const y = target.getBoundingClientRect().top + window.scrollY - HEADING_SCROLL_OFFSET
  window.scrollTo({ top: Math.max(0, y), behavior: options?.behavior ?? 'smooth' })
  return true
}

export function scrollToHeadingByIdWithRetry(
  id: string,
  options?: { behavior?: ScrollBehavior; retries?: number; delayMs?: number }
) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {}

  let cancelled = false
  let attempts = 0
  let timer: number | null = null
  const retries = options?.retries ?? 8
  const delayMs = options?.delayMs ?? 120

  const tryScroll = () => {
    if (cancelled) return

    const found = scrollToHeadingById(id, { behavior: options?.behavior })
    if (found || attempts >= retries) return

    attempts += 1
    timer = window.setTimeout(tryScroll, delayMs)
  }

  tryScroll()

  return () => {
    cancelled = true
    if (timer != null) {
      window.clearTimeout(timer)
    }
  }
}

export function getActiveHeadingId(
  ids: string[],
  options?: { offset?: number; threshold?: number }
) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null
  if (ids.length === 0) return null

  const offset = options?.offset ?? HEADING_SCROLL_OFFSET
  const threshold = options?.threshold ?? 12
  const anchorY = window.scrollY + offset + threshold

  let activeId: string | null = null

  for (const id of ids) {
    const element = document.getElementById(id)
    if (!element) continue

    const top = element.getBoundingClientRect().top + window.scrollY
    if (top <= anchorY) {
      activeId = id
      continue
    }
    break
  }

  if (activeId) return activeId

  for (const id of ids) {
    if (document.getElementById(id)) return id
  }

  return null
}

export function collectTocFromMarkdown(markdown: string): TocHeading[] {
  const lines = markdown.split('\n')
  const headings: Array<{ depth: 2 | 3; text: string }> = []
  let activeFence: { marker: '`' | '~'; size: number } | null = null

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '')
    const fenceMatch = /^( {0,3})(`{3,}|~{3,})/.exec(line)

    if (fenceMatch) {
      const marker = fenceMatch[2][0] as '`' | '~'
      const size = fenceMatch[2].length

      if (!activeFence) {
        activeFence = { marker, size }
        continue
      }

      if (activeFence.marker === marker && size >= activeFence.size) {
        activeFence = null
        continue
      }
    }

    if (activeFence) continue
    if (/^( {4,}|\t)/.test(rawLine)) continue

    const match = /^( {0,3})(#{2,3})[ \t]+(.+?)(?:[ \t]+#+[ \t]*)?$/.exec(line)
    if (!match) continue
    const depth = match[2].length as 2 | 3
    const text = stripInlineMarkdown(match[3])
    if (!text) continue
    headings.push({ depth, text })
  }

  const idCounts = createHeadingIdMap()
  return headings.map(({ depth, text }) => {
    const id = nextHeadingId(idCounts, text)
    return { id, depth, text }
  })
}
