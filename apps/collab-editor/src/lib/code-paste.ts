import type { BlockNoteEditor } from '@blocknote/core'

type CodePasteContext = {
  event: ClipboardEvent
  editor: BlockNoteEditor<any, any, any>
  defaultPasteHandler: (context?: {
    prioritizeMarkdownOverHTML?: boolean
    plainTextAsMarkdown?: boolean
  }) => boolean | undefined
}

type CodePastePayload =
  | { kind: 'block'; code: string; language?: string }
  | { kind: 'inline'; markdown: string }

export function handleCodeAwarePaste({
  event,
  editor,
  defaultPasteHandler,
}: CodePasteContext): boolean | undefined {
  const payload = getCodePastePayload(event)
  if (!payload) {
    const headingMarkdown = getHeadingAwareMarkdown(event)
    if (headingMarkdown) {
      editor.pasteMarkdown(headingMarkdown)
      return true
    }

    return defaultPasteHandler()
  }

  if (payload.kind === 'inline') {
    editor.pasteMarkdown(payload.markdown)
    return true
  }

  pasteCodeBlock(editor, payload.code, payload.language)
  return true
}

function getCodePastePayload(event: ClipboardEvent): CodePastePayload | null {
  const html = event.clipboardData?.getData('text/html') ?? ''
  const plainText = event.clipboardData?.getData('text/plain') ?? ''
  const markdown = event.clipboardData?.getData('text/markdown') ?? ''

  if (markdown && looksLikeFencedCode(markdown)) {
    return { kind: 'inline', markdown }
  }

  const htmlCode = extractCodeFromHtml(html)
  if (htmlCode) return htmlCode

  if (looksLikeFencedCode(plainText)) {
    return { kind: 'inline', markdown: plainText }
  }

  return null
}

function getHeadingAwareMarkdown(event: ClipboardEvent): string | null {
  const html = event.clipboardData?.getData('text/html') ?? ''
  if (!html) return null

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const markdown = htmlToMarkdownWithHeadings(doc.body)
  if (!markdown.includes('#')) return null

  return markdown
}

function extractCodeFromHtml(html: string): CodePastePayload | null {
  if (!html) return null

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const codeBlock = findCodeBlockElement(doc)
  if (codeBlock) {
    return {
      kind: 'block',
      code: normalizeCodeText(codeBlock.textContent ?? ''),
      language: getCodeLanguage(codeBlock),
    }
  }

  const inlineCode = findInlineCodeElements(doc)
  if (inlineCode.length === 0) return null

  return {
    kind: 'inline',
    markdown: htmlToMarkdownWithInlineCode(doc.body, new Set(inlineCode)),
  }
}

function findCodeBlockElement(doc: Document): HTMLElement | null {
  const selectors = [
    'pre code',
    'pre',
    '[data-code-block="true"]',
    '[data-language] code',
    '[class*="code-block"]',
    '[class*="CodeBlock"]',
    '[class*="codeBlock"]',
    '[class*="lark-code"]',
    '[class*="ace_editor"]',
    '[class*="cm-content"]',
    '[style*="font-family"][style*="monospace"]',
  ]

  for (const selector of selectors) {
    const element = doc.querySelector(selector)
    if (element && isBlockCodeCandidate(element)) {
      return element as HTMLElement
    }
  }

  return null
}

function isBlockCodeCandidate(element: Element): boolean {
  const text = normalizeCodeText(element.textContent ?? '')
  if (!text) return false
  if (element.tagName === 'CODE' && element.closest('pre')) return true
  if (element.tagName === 'PRE') return true
  if (text.includes('\n')) return true

  return Boolean(
    element.getAttribute('data-language') ||
      element.getAttribute('data-code-block') ||
      /code|monospace|ace_editor|cm-content/i.test(element.getAttribute('class') ?? '')
  )
}

function findInlineCodeElements(doc: Document): HTMLElement[] {
  return Array.from(doc.querySelectorAll('code')).filter((element) => {
    const text = element.textContent?.trim() ?? ''
    return text.length > 0 && !element.closest('pre')
  }) as HTMLElement[]
}

function htmlToMarkdownWithInlineCode(root: HTMLElement, inlineCode: Set<HTMLElement>): string {
  const parts: string[] = []
  root.childNodes.forEach((node) => appendMarkdownNode(node, inlineCode, parts))
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim()
}

function htmlToMarkdownWithHeadings(root: HTMLElement): string {
  const blocks = getTopLevelRichTextBlocks(root)
  const lines = blocks.map((block) => elementToHeadingMarkdown(block)).filter(Boolean)

  return lines.join('\n\n').trim()
}

function getTopLevelRichTextBlocks(root: HTMLElement): HTMLElement[] {
  const blockSelectors = [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'div',
    '[data-block-type]',
    '[data-heading-level]',
    '[data-level]',
  ].join(',')

  const directBlocks = Array.from(root.children).filter((element) =>
    element.matches(blockSelectors)
  ) as HTMLElement[]

  if (directBlocks.length > 0) return directBlocks

  return Array.from(root.querySelectorAll(blockSelectors)) as HTMLElement[]
}

function elementToHeadingMarkdown(element: HTMLElement): string {
  const text = normalizeInlineText(element.textContent ?? '')
  if (!text) return ''

  const level = getHeadingLevel(element)
  if (!level) return text

  return `${'#'.repeat(level)} ${text}`
}

function getHeadingLevel(element: HTMLElement): number | null {
  const tagLevel = getHeadingTagLevel(element)
  if (tagLevel) return tagLevel

  const explicitLevel = getExplicitHeadingLevel(element)
  if (explicitLevel) return explicitLevel

  if (!isLikelyHeadingElement(element)) return null

  const fontSizeLevel = getHeadingLevelFromFontSize(element)
  if (fontSizeLevel) return fontSizeLevel

  return null
}

function getHeadingTagLevel(element: HTMLElement): number | null {
  const match = element.tagName.match(/^H([1-6])$/)
  return match ? Number(match[1]) : null
}

function getExplicitHeadingLevel(element: HTMLElement): number | null {
  const rawLevel =
    element.getAttribute('data-heading-level') ||
    element.getAttribute('data-level') ||
    element.getAttribute('aria-level') ||
    element.closest('[data-heading-level]')?.getAttribute('data-heading-level') ||
    element.closest('[data-level]')?.getAttribute('data-level')

  const level = Number(rawLevel)
  if (Number.isFinite(level) && level >= 1 && level <= 6) return Math.round(level)

  const className = element.getAttribute('class') ?? ''
  const classMatch = className.match(/(?:heading|title|header|h)(?:-|_)?([1-6])/i)
  if (classMatch) return Number(classMatch[1])

  return null
}

function isLikelyHeadingElement(element: HTMLElement): boolean {
  const className = element.getAttribute('class') ?? ''
  const dataType = [
    element.getAttribute('data-block-type'),
    element.getAttribute('data-type'),
    element.getAttribute('data-node-type'),
  ]
    .filter(Boolean)
    .join(' ')

  if (/heading|title|header/i.test(`${className} ${dataType}`)) return true

  const style = element.getAttribute('style') ?? ''
  return /font-size|font-weight/i.test(style)
}

function getHeadingLevelFromFontSize(element: HTMLElement): number | null {
  const fontSize = getInlineFontSizePx(element)
  if (!fontSize) return null

  if (fontSize >= 28) return 1
  if (fontSize >= 24) return 2
  if (fontSize >= 20) return 3
  if (fontSize >= 18 && hasStrongWeight(element)) return 4

  return null
}

function getInlineFontSizePx(element: HTMLElement): number | null {
  const style = element.getAttribute('style') ?? ''
  const match = style.match(/font-size\s*:\s*([\d.]+)(px|pt|em|rem)?/i)
  if (!match) return null

  const value = Number(match[1])
  if (!Number.isFinite(value)) return null

  const unit = match[2]?.toLowerCase()
  if (unit === 'pt') return value * 1.333
  if (unit === 'em' || unit === 'rem') return value * 16
  return value
}

function hasStrongWeight(element: HTMLElement): boolean {
  const style = element.getAttribute('style') ?? ''
  const weightMatch = style.match(/font-weight\s*:\s*(bold|[5-9]00)/i)
  return Boolean(weightMatch || element.querySelector('strong,b'))
}

function appendMarkdownNode(
  node: ChildNode,
  inlineCode: Set<HTMLElement>,
  parts: string[]
) {
  if (node.nodeType === Node.TEXT_NODE) {
    parts.push(node.textContent ?? '')
    return
  }

  if (!(node instanceof HTMLElement)) return

  if (inlineCode.has(node)) {
    parts.push(`\`${escapeInlineCode(node.textContent ?? '')}\``)
    return
  }

  if (node.tagName === 'BR') {
    parts.push('\n')
    return
  }

  node.childNodes.forEach((child) => appendMarkdownNode(child, inlineCode, parts))

  if (['DIV', 'P', 'LI'].includes(node.tagName)) {
    parts.push('\n')
  }
}

function pasteCodeBlock(editor: BlockNoteEditor<any, any, any>, code: string, language?: string) {
  const currentBlock = editor.getTextCursorPosition().block
  const codeBlock = {
    type: 'codeBlock',
    props: language ? { language } : undefined,
    content: code,
  }

  if (Array.isArray(currentBlock.content) && currentBlock.content.length === 0) {
    editor.updateBlock(currentBlock, codeBlock as any)
    return
  }

  const inserted = editor.insertBlocks([codeBlock as any], currentBlock, 'after')
  if (inserted[0]) {
    editor.setTextCursorPosition(inserted[0], 'end')
  }
}

function getCodeLanguage(element: HTMLElement): string | undefined {
  const language =
    element.getAttribute('data-language') ||
    element.closest('[data-language]')?.getAttribute('data-language') ||
    Array.from(element.classList)
      .find((className) => className.startsWith('language-'))
      ?.replace('language-', '')

  return language || undefined
}

function looksLikeFencedCode(text: string): boolean {
  return /^```[\s\S]*```$/m.test(text.trim())
}

function normalizeCodeText(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').trimEnd()
}

function normalizeInlineText(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim()
}

function escapeInlineCode(text: string): string {
  return text.replace(/`/g, '\\`')
}
