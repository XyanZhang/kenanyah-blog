import { describe, expect, it } from 'vitest'
import {
  collectTocFromMarkdown,
  createHeadingIdGenerator,
  getActiveHeadingId,
  slugifyHeading,
} from './heading'

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

  it('normalizes inline markdown so toc ids match rendered heading text', () => {
    const markdown = [
      '## Intro with `code`',
      '### Learn [React](https://react.dev) basics',
      '## **Bold** and _italic_',
      '## Image ![Alt Text](https://example.com/a.png)',
    ].join('\n')

    expect(collectTocFromMarkdown(markdown)).toEqual([
      { id: 'intro-with-code', depth: 2, text: 'Intro with code' },
      { id: 'learn-react-basics', depth: 3, text: 'Learn React basics' },
      { id: 'bold-and-italic', depth: 2, text: 'Bold and italic' },
      { id: 'image-alt-text', depth: 2, text: 'Image Alt Text' },
    ])
  })

  it('generates the same duplicate ids in heading order', () => {
    const nextId = createHeadingIdGenerator()

    expect(nextId('Intro')).toBe('intro')
    expect(nextId('Detail')).toBe('detail')
    expect(nextId('Intro')).toBe('intro-2')
  })

  it('finds the latest heading above the scroll anchor', () => {
    document.body.innerHTML = `
      <h2 id="intro">Intro</h2>
      <h2 id="detail">Detail</h2>
      <h2 id="summary">Summary</h2>
    `

    const positions = new Map([
      ['intro', 40],
      ['detail', 180],
      ['summary', 460],
    ])

    for (const [id, top] of positions) {
      const element = document.getElementById(id)
      if (!element) continue
      Object.defineProperty(element, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({
          top: top - window.scrollY,
          left: 0,
          width: 0,
          height: 0,
          right: 0,
          bottom: top - window.scrollY,
          x: 0,
          y: top - window.scrollY,
          toJSON: () => ({}),
        }),
      })
    }

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    expect(getActiveHeadingId(['intro', 'detail', 'summary'], { offset: 110, threshold: 12 })).toBe(
      'intro'
    )

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 90 })
    expect(getActiveHeadingId(['intro', 'detail', 'summary'], { offset: 110, threshold: 12 })).toBe(
      'detail'
    )
  })
})
