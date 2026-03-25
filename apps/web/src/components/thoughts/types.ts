export interface ThoughtPost {
  id: string
  /** 用于判断是否展示「编辑」等作者操作 */
  authorId?: string | null
  avatar: string
  authorName: string
  date: string
  content: string
  images: string[]
  likeCount: number
  commentCount: number
}

export interface ThoughtPostWithInteraction extends ThoughtPost {
  liked?: boolean
  disliked?: boolean
  questioned?: boolean
}
