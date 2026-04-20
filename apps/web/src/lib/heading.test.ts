import { describe, expect, it } from 'vitest'
import { collectTocFromMarkdown, createHeadingIdGenerator, slugifyHeading } from './heading'

describe('heading helpers', () => {
  it('slugifies heading text', () => {
    expect(slugifyHeading(' Hello, World! 你好 ')).toBe('hello-world-你好')
  })

  it('ignores fenced and indented code blocks when building toc', () => {
    const markdown = [
      '## Real Heading',
      '',
      '```ts',
      '## Fake Heading In Code',
      '```',
      '',
      '    ## Fake Indented Heading',
      '',
      '### Child Heading ###',
      '## Real Heading',
    ].join('\n')

    expect(collectTocFromMarkdown(markdown)).toEqual([
      { id: 'real-heading', depth: 2, text: 'Real Heading' },
      { id: 'child-heading', depth: 3, text: 'Child Heading' },
      { id: 'real-heading-2', depth: 2, text: 'Real Heading' },
    ])
  })

  it('generates the same duplicate ids in heading order', () => {
    const nextId = createHeadingIdGenerator()

    expect(nextId('Intro')).toBe('intro')
    expect(nextId('Detail')).toBe('detail')
    expect(nextId('Intro')).toBe('intro-2')
  })
})
