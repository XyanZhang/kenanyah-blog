export interface Comment {
  id: string
  content: string
  approved: boolean
  postId: string
  authorId: string
  parentId: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreateCommentDto = Pick<Comment, 'content'> & {
  parentId?: string
}

export type UpdateCommentDto = Pick<Comment, 'content'>

export interface CommentWithRelations extends Comment {
  author: {
    id: string
    username: string
    name: string | null
    avatar: string | null
  }
  replies?: CommentWithRelations[]
  _count?: {
    replies: number
  }
}
