/**
 * Truncate a string to a maximum length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to append (default: '...')
 * @returns Truncated string
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength - suffix.length) + suffix
}

/**
 * Extract plain text from HTML
 * @param html - HTML string
 * @returns Plain text
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

/**
 * Generate an excerpt from content
 * @param content - Content to excerpt
 * @param maxLength - Maximum length (default: 200)
 * @returns Excerpt
 */
export function generateExcerpt(content: string, maxLength = 200): string {
  const plainText = stripHtml(content)
  return truncate(plainText, maxLength)
}

/**
 * Capitalize the first letter of a string
 * @param text - Text to capitalize
 * @returns Capitalized string
 */
export function capitalize(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}
