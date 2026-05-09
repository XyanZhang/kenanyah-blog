import { describe, expect, it } from 'vitest'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'https://example.com/db'
process.env.JWT_SECRET = process.env.JWT_SECRET || '12345678901234567890123456789012'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '12345678901234567890123456789012'

describe('generic knowledge PDF import parsing', () => {
  it('splits common classical book headings into sections', async () => {
    const { splitKnowledgePdfSections } = await import('./knowledge-pdf-import')
    const sections = splitKnowledgePdfSections([
      '卷一',
      '论五行',
      '五行者，金木水火土也。',
      '',
      '卷二',
      '论十干',
      '十干各有阴阳。',
    ].join('\n'), '《三命通会》')

    expect(sections.length).toBeGreaterThanOrEqual(2)
    expect(sections[0].heading).toBe('卷一')
    expect(sections.some((section) => section.heading === '卷二')).toBe(true)
  })

  it('falls back to source title when headings are not detected', async () => {
    const { splitKnowledgePdfSections } = await import('./knowledge-pdf-import')
    const sections = splitKnowledgePdfSections('这是一段没有明显标题的资料内容。', '《三命通会》')

    expect(sections).toHaveLength(1)
    expect(sections[0].heading).toBe('《三命通会》')
  })
})
