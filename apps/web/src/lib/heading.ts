export type TocHeading = {
  id: string
  depth: 2 | 3
  text: string
}

export function slugifyHeading(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function collectTocFromMarkdown(markdown: string): TocHeading[] {
  const lines = markdown.split('\n')
  const headings: Array<{ depth: 2 | 3; text: string }> = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line.startsWith('#')) continue
    if (line.startsWith('####')) continue

    const match = /^(#{2,3})\s+(.*)$/.exec(line)
    if (!match) continue
    const depth = match[1].length as 2 | 3
    const text = match[2].replace(/\s+#.*$/, '').trim()
    if (!text) continue
    headings.push({ depth, text })
  }

  const idCounts = new Map<string, number>()
  return headings.map(({ depth, text }) => {
    const base = slugifyHeading(text) || 'section'
    const prev = idCounts.get(base) ?? 0
    idCounts.set(base, prev + 1)
    const id = prev === 0 ? base : `${base}-${prev + 1}`
    return { id, depth, text }
  })
}

