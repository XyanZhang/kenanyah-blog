import { DashboardLayout } from '@blog/types'
import { STORAGE_KEY } from '../constants/dashboard'

/**
 * Load dashboard layout from localStorage
 */
export function loadLayout(): DashboardLayout | null {
  try {
    if (typeof window === 'undefined') return null

    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored)

    // Convert date strings back to Date objects
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
      cards: parsed.cards.map((card: any) => ({
        ...card,
        createdAt: new Date(card.createdAt),
        updatedAt: new Date(card.updatedAt),
      })),
    }
  } catch (error) {
    console.error('Failed to load dashboard layout:', error)
    return null
  }
}

/**
 * Save dashboard layout to localStorage
 */
export function saveLayout(layout: DashboardLayout): void {
  try {
    if (typeof window === 'undefined') return

    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch (error) {
    console.error('Failed to save dashboard layout:', error)
    throw new Error('Failed to save layout')
  }
}

/**
 * Clear dashboard layout from localStorage
 */
export function clearLayout(): void {
  try {
    if (typeof window === 'undefined') return

    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear dashboard layout:', error)
  }
}

/**
 * Export layout as JSON string
 */
export function exportLayout(layout: DashboardLayout): string {
  return JSON.stringify(layout, null, 2)
}

/**
 * Import layout from JSON string
 */
export function importLayout(jsonString: string): DashboardLayout {
  try {
    const parsed = JSON.parse(jsonString)

    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
      cards: parsed.cards.map((card: any) => ({
        ...card,
        createdAt: new Date(card.createdAt),
        updatedAt: new Date(card.updatedAt),
      })),
    }
  } catch (error) {
    console.error('Failed to import layout:', error)
    throw new Error('Invalid layout format')
  }
}
