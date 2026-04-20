export type TocHeading = {
  id: string
  depth: 2 | 3
  text: string
}

const HEADING_SCROLL_OFFSET = 110

export function slugifyHeading(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
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
    const text = match[3].trim()
    if (!text) continue
    headings.push({ depth, text })
  }

  const idCounts = createHeadingIdMap()
  return headings.map(({ depth, text }) => {
    const id = nextHeadingId(idCounts, text)
    return { id, depth, text }
  })
}
