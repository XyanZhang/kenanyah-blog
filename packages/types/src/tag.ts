export interface Tag {
  id: string
  slug: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export type CreateTagDto = Pick<Tag, 'name'>

export type UpdateTagDto = Partial<CreateTagDto>

export interface TagWithCount extends Tag {
  _count?: {
    posts: number
  }
}
