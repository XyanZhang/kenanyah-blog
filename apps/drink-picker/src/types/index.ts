export type Brand = 'luckin' | 'cotti' | 'starbucks'

export type DrinkCategory = 'coffee' | 'milk_tea' | 'fruit_tea' | 'specialty' | 'cold_brew'

export type MoodType =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'tired'
  | 'excited'
  | 'calm'
  | 'romantic'
  | 'energetic'

export type MbtiType =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP'

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export type TasteProfile = {
  sweet: number
  bitter: number
  sour: number
  rich: number
  refreshing: number
}

export interface Drink {
  id: string
  name: string
  brand: Brand
  category: DrinkCategory
  taste: TasteProfile
  moodMatch: MoodType[]
  mbtiMatch: MbtiType[]
  season: Season[]
  description: string
  emoji: string
}

export interface Mood {
  type: MoodType
  label: string
  emoji: string
  description: string
}

export interface MbtiProfile {
  type: MbtiType
  label: string
  nickname: string
  emoji: string
  tastePreference: TasteProfile
}

export interface CalendarInfo {
  date: string
  weekday: string
  lunarDate: string
  lunarMonth: string
  ganZhi: string
  yi: string[]
  ji: string[]
  drinkHint: string
}

export interface Recommendation {
  drink: Drink
  reason: string
  score: number
}

export interface RecommendResult {
  recommendations: Recommendation[]
  calendarInfo: CalendarInfo
  summary: string
  brand: Brand
  mood: MoodType
  mbti: MbtiType
}
