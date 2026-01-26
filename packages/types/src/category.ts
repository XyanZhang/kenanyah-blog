export interface Category {
  id: string
  slug: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreateCategoryDto = Pick<Category, 'name' | 'description'>

export type UpdateCategoryDto = Partial<CreateCategoryDto>

export interface CategoryWithCount extends Category {
  _count?: {
    posts: number
  }
}
