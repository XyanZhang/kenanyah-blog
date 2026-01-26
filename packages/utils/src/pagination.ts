import { PaginationMeta } from '@blog/types'

/**
 * Calculate pagination metadata
 * @param total - Total number of items
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Pagination metadata
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit)

  return {
    total,
    page,
    limit,
    totalPages,
  }
}

/**
 * Calculate skip value for database queries
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Number of items to skip
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit
}

/**
 * Validate and normalize pagination parameters
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10, max: 100)
 * @returns Normalized pagination parameters
 */
export function normalizePagination(
  page?: number,
  limit?: number
): { page: number; limit: number } {
  const normalizedPage = Math.max(1, page || 1)
  const normalizedLimit = Math.min(100, Math.max(1, limit || 10))

  return {
    page: normalizedPage,
    limit: normalizedLimit,
  }
}
