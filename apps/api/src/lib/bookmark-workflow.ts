import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

const FETCH_TIMEOUT_MS = 8000
const MAX_HTML_BYTES = 1024 * 1024
const MAX_ARTICLE_TEXT_CHARS = 18_000

export type BookmarkMetadata = {
  title: string | null
  favicon: string | null
  description: string | null
}

export type BookmarkArticle = BookmarkMetadata & {
  url: string
  text: string | null
}

export type BookmarkLinkCheck = {
  ok: boolean
  status: number | null
  statusText: string | null
  finalUrl: string
  checkedAt: string
  error: string | null
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function cleanText(value: string | null) {
  if (!value) return null
  const cleaned = decodeHtmlEntities(value).replace(/\s+/g, ' ').trim()
  return cleaned || null
}

function stripHtmlNoise(html: string) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
}

function htmlToText(html: string) {
  const withBreaks = stripHtmlNoise(html)
    .replace(/<(\/p|\/h[1-6]|\/li|br|\/blockquote|\/pre|\/article|\/section)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
  return cleanText(withBreaks)
}

function extractTagContent(html: string, tagName: string) {
  const match = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i').exec(html)
  return match?.[1] ?? null
}

function extractArticleText(html: string) {
  const candidates = [
    extractTagContent(html, 'article'),
    ...Array.from(html.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/gi)).map((match) => match[1]),
    ...Array.from(html.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/gi)).map((match) => match[1]),
  ]
    .map((candidate) => htmlToText(candidate ?? ''))
    .filter((text): text is string => Boolean(text && text.length > 300))
    .sort((a, b) => b.length - a.length)

  const text = candidates[0] ?? htmlToText(html)
  return text ? text.slice(0, MAX_ARTICLE_TEXT_CHARS) : null
}

function extractReadableArticle(html: string, url: string) {
  try {
    const dom = new JSDOM(html, { url })
    const article = new Readability(dom.window.document).parse()
    const text = cleanText(article?.textContent ?? null)
    if (!text || text.length < 300) return null
    return {
      title: cleanText(article?.title ?? null),
      text: text.slice(0, MAX_ARTICLE_TEXT_CHARS),
    }
  } catch {
    return null
  }
}

function getAttribute(tag: string, name: string) {
  const match = new RegExp(`${name}=["']([^"']+)["']`, 'i').exec(tag)
  return match?.[1] ?? null
}

function getMetaContent(html: string, key: string) {
  const tags = html.match(/<meta\s+[^>]*>/gi) ?? []
  for (const tag of tags) {
    const name = getAttribute(tag, 'name') || getAttribute(tag, 'property')
    if (name?.toLowerCase() === key.toLowerCase()) {
      return cleanText(getAttribute(tag, 'content'))
    }
  }
  return null
}

function getTitle(html: string) {
  return (
    getMetaContent(html, 'og:title') ||
    getMetaContent(html, 'twitter:title') ||
    cleanText(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? null)
  )
}

function getDescription(html: string) {
  return getMetaContent(html, 'description') || getMetaContent(html, 'og:description')
}

function resolveUrl(rawUrl: string | null, baseUrl: string) {
  if (!rawUrl) return null
  try {
    return new URL(rawUrl, baseUrl).toString()
  } catch {
    return null
  }
}

function getFavicon(html: string, pageUrl: string) {
  const links = html.match(/<link\s+[^>]*>/gi) ?? []
  for (const link of links) {
    const rel = getAttribute(link, 'rel')
    const href = getAttribute(link, 'href')
    if (rel && href && /(?:icon|apple-touch-icon)/i.test(rel)) {
      return resolveUrl(href, pageUrl)
    }
  }
  return resolveUrl('/favicon.ico', pageUrl)
}

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, {
      redirect: 'follow',
      ...init,
      headers: {
        'user-agent': 'blog-bookmark-workflow/1.0',
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchBookmarkMetadata(url: string): Promise<BookmarkMetadata> {
  if (!isHttpUrl(url)) {
    return { title: null, favicon: null, description: null }
  }

  try {
    const response = await fetchWithTimeout(url, {
      headers: { accept: 'text/html,application/xhtml+xml' },
    })
    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || !contentType.includes('text/html')) {
      return {
        title: null,
        favicon: resolveUrl('/favicon.ico', url),
        description: null,
      }
    }

    const html = (await response.text()).slice(0, MAX_HTML_BYTES)
    return {
      title: getTitle(html),
      favicon: getFavicon(html, response.url || url),
      description: getDescription(html),
    }
  } catch {
    return {
      title: null,
      favicon: resolveUrl('/favicon.ico', url),
      description: null,
    }
  }
}

export async function fetchBookmarkArticle(url: string): Promise<BookmarkArticle> {
  if (!isHttpUrl(url)) {
    return { url, title: null, favicon: null, description: null, text: null }
  }

  try {
    const response = await fetchWithTimeout(url, {
      headers: { accept: 'text/html,application/xhtml+xml' },
    })
    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || !contentType.includes('text/html')) {
      return {
        url: response.url || url,
        title: null,
        favicon: resolveUrl('/favicon.ico', url),
        description: null,
        text: null,
      }
    }

    const html = (await response.text()).slice(0, MAX_HTML_BYTES)
    const readable = extractReadableArticle(html, response.url || url)
    return {
      url: response.url || url,
      title: readable?.title || getTitle(html),
      favicon: getFavicon(html, response.url || url),
      description: getDescription(html),
      text: readable?.text || extractArticleText(html),
    }
  } catch {
    return {
      url,
      title: null,
      favicon: resolveUrl('/favicon.ico', url),
      description: null,
      text: null,
    }
  }
}

export async function checkBookmarkLink(url: string): Promise<BookmarkLinkCheck> {
  const checkedAt = new Date().toISOString()
  if (!isHttpUrl(url)) {
    return {
      ok: false,
      status: null,
      statusText: null,
      finalUrl: url,
      checkedAt,
      error: 'Only http and https URLs can be checked.',
    }
  }

  try {
    let response = await fetchWithTimeout(url, { method: 'HEAD' })
    if (response.status === 405 || response.status === 403) {
      response = await fetchWithTimeout(url, { method: 'GET' })
    }
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      finalUrl: response.url || url,
      checkedAt,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      status: null,
      statusText: null,
      finalUrl: url,
      checkedAt,
      error: error instanceof Error ? error.message : 'Link check failed.',
    }
  }
}

export function bookmarkToThoughtContent(bookmark: {
  title: string
  url: string
  notes: string | null
  category: string | null
}) {
  return [
    bookmark.title,
    bookmark.notes,
    bookmark.category ? `分类：${bookmark.category}` : null,
    bookmark.url,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function bookmarkToDraftContent(bookmark: {
  title: string
  url: string
  notes: string | null
  category: string | null
}) {
  return [
    `# ${bookmark.title}`,
    bookmark.notes || '这里记录从收藏链接整理出的草稿。',
    `原始链接：${bookmark.url}`,
    bookmark.category ? `分类：${bookmark.category}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')
}
