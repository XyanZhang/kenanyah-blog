import { describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgresql://blog_user:blog_password@localhost:5434/blog_test_env?schema=public'
process.env.JWT_SECRET ??= 'test-jwt-secret-for-yijing-parser-123456'
process.env.JWT_REFRESH_SECRET ??= 'test-jwt-refresh-secret-for-yijing-parser-123456'

const sample = [
  '《易 经》全文',
  '',
  '第一卦 乾 乾为天 乾上乾下',
  '',
  '乾：元，亨，利，贞。',
  '',
  '象曰：天行健，君子以自强不息。',
  '',
  '第二卦 坤 坤为地 坤上坤下',
  '',
  '坤：元亨，利牝马之贞。',
  '',
  '象曰：地势坤，君子以厚德载物。',
].join('\n')

describe('yijing knowledge parser', () => {
  it('splits source text by hexagram headings', async () => {
    const { splitYijingSections } = await import('./yijing-knowledge')
    const sections = splitYijingSections(sample)

    expect(sections).toHaveLength(2)
    expect(sections[0].heading).toContain('第一卦 乾')
    expect(sections[0].hexagramName).toBe('乾')
    expect(sections[1].heading).toContain('第二卦 坤')
    expect(sections[1].hexagramName).toBe('坤')
  })

  it('keeps heading context in parsed chunk titles', async () => {
    const { parseYijingText } = await import('./yijing-knowledge')
    const chunks = await parseYijingText(sample)

    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[0].title).toContain('第一卦 乾')
    expect(chunks[0].content).toContain('自强不息')
  })
})
