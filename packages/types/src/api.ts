export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: PaginationMeta
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PostFilters extends PaginationParams {
  category?: string
  tag?: string
  published?: boolean
  authorId?: string
  search?: string
}
