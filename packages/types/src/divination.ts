export type DivinationConsultationMode = 'daily' | 'bazi' | 'name' | 'event'

export type DivinationQuestionType =
  | 'career'
  | 'relationship'
  | 'wealth'
  | 'health'
  | 'travel'
  | 'general'

export interface DivinationCitationDto {
  sourceId: string
  sourceTitle: string
  excerpt: string
  relevance: number
}

export interface DivinationConsultationDto {
  id: string
  mode: DivinationConsultationMode
  questionType: DivinationQuestionType
  question: string
  targetDate?: string
  answer: string
  citations: DivinationCitationDto[]
  status: 'stub' | 'generated'
  createdAt: string
}
