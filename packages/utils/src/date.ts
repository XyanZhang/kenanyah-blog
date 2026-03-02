import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'

/**
 * Format a date to a readable string
 * @param date - Date to format
 * @param formatStr - Format string (default: 'MMM d, yyyy')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, formatStr = 'MMM d, yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) {
    return 'Invalid date'
  }
  return format(dateObj, formatStr)
}

/**
 * Format a date to a relative time string (e.g., "2 hours ago")
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) {
    return 'Invalid date'
  }
  return formatDistanceToNow(dateObj, { addSuffix: true })
}

/**
 * Format a date for display in a post (e.g., "January 26, 2026")
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatPostDate(date: Date | string): string {
  return formatDate(date, 'MMMM d, yyyy')
}
