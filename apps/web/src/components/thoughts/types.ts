export interface ThoughtPost {
  id: string
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
