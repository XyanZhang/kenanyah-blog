import { describe, expect, it } from 'vitest'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'https://example.com/db'
process.env.JWT_SECRET = process.env.JWT_SECRET || '12345678901234567890123456789012'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '12345678901234567890123456789012'

describe('ziwei knowledge parsing', () => {
  it('splits common Zi Wei headings into sections', async () => {
    const { splitZiweiSections } = await import('./ziwei-knowledge')
    const sections = splitZiweiSections([
      '紫微星',
      '紫微入命宫，主尊贵而须看庙旺。',
      '',
      '四化',
      '化禄、化权、化科、化忌需要结合宫位。',
      '',
      '大限',
      '大限用于观察阶段性的学习案例。',
    ].join('\n'))

    expect(sections).toHaveLength(3)
    expect(sections.map((section) => section.heading)).toEqual(['紫微星', '四化', '大限'])
  })

  it('falls back to whole text when no heading is detected', async () => {
    const { splitZiweiSections } = await import('./ziwei-knowledge')
    const sections = splitZiweiSections('这是一段普通资料，没有明显标题。')

    expect(sections).toHaveLength(1)
    expect(sections[0].heading).toBe('《紫微斗数全书》全文')
  })

  it('creates chunks with stable indexes and section titles', async () => {
    const { parseZiweiText } = await import('./ziwei-knowledge')
    const chunks = await parseZiweiText([
      '命宫',
      '命宫为学习紫微斗数的重要入口，需要结合三方四正与主星观察。',
      '',
      '四化',
      '四化包含化禄、化权、化科、化忌，学习时宜先理解象义。',
    ].join('\n'))

    expect(chunks.length).toBeGreaterThanOrEqual(2)
    expect(chunks[0]).toMatchObject({
      chunkIndex: 0,
      sectionTitle: '命宫',
    })
    expect(chunks[1]).toMatchObject({
      chunkIndex: 1,
      sectionTitle: '四化',
    })
  })
})
