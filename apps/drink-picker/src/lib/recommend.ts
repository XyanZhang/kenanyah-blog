import type { Brand, Drink, MbtiType, MoodType, Recommendation, TasteProfile } from '@/types'
import { brandLabels } from '@/data/drinks'
import { mbtiProfiles } from '@/data/mbti'
import { getCalendarInfo, getSeason } from '@/data/calendar'
import { listDrinks } from '@/lib/drink-repository'

function dotProduct(a: TasteProfile, b: TasteProfile): number {
  return a.sweet * b.sweet + a.bitter * b.bitter + a.sour * b.sour + a.rich * b.rich + a.refreshing * b.refreshing
}

function tasteMagnitude(t: TasteProfile): number {
  return Math.sqrt(t.sweet ** 2 + t.bitter ** 2 + t.sour ** 2 + t.rich ** 2 + t.refreshing ** 2)
}

function cosineSimilarity(a: TasteProfile, b: TasteProfile): number {
  const magA = tasteMagnitude(a)
  const magB = tasteMagnitude(b)
  if (magA === 0 || magB === 0) return 0
  return dotProduct(a, b) / (magA * magB)
}

function scoreDrink(drink: Drink, mood: MoodType, mbti: MbtiType, season: string): number {
  let score = 0

  // 心情匹配 (40%)
  if (drink.moodMatch.includes(mood)) {
    score += 40
  }

  // MBTI 匹配 (30%)
  if (drink.mbtiMatch.includes(mbti)) {
    score += 30
  }

  // 季节匹配 (15%)
  if (drink.season.includes(season as Drink['season'][number])) {
    score += 15
  }

  // MBTI 口味偏好 (15%)
  const mbtiProfile = mbtiProfiles.find((p) => p.type === mbti)
  if (mbtiProfile) {
    const similarity = cosineSimilarity(drink.taste, mbtiProfile.tastePreference)
    score += similarity * 15
  }

  return score
}

const REASON_TEMPLATES: Record<string, (drink: Drink, mood: string, mbti: string) => string> = {
  happy: (drink, _, mbti) => `心情美美的时候就要配${drink.name}！${mbti}的你值得这份小确幸～`,
  sad: (drink, _, mbti) => `别难过啦，来杯${drink.name}暖暖～${mbti}的温柔需要被呵护`,
  angry: (drink, _, mbti) => `消消气～${drink.name}的${drink.taste.bitter > 3 ? '苦涩' : '甜蜜'}刚好匹配${mbti}的气场`,
  tired: (drink, _, mbti) => `困了吗？${drink.name}来拯救${mbti}的你，提神醒脑！`,
  excited: (drink, _, mbti) => `这么开心当然要${drink.name}！和${mbti}的活力一起嗨起来～`,
  calm: (drink, _, mbti) => `岁月静好，${drink.name}刚好。${mbti}式的慢生活美学`,
  romantic: (drink, _, mbti) => `甜甜的${drink.name}，和${mbti}的浪漫很配哦～`,
  energetic: (drink, _, mbti) => `${mbti}充能中！${drink.name}为你加满能量⚡`,
}

function generateReason(drink: Drink, mood: MoodType, mbti: MbtiType, calendarHint: string): string {
  const template = REASON_TEMPLATES[mood]
  const baseReason = template(drink, mood, mbti)
  return `${baseReason}\n${calendarHint}`
}

const SUMMARY_TEMPLATES = [
  '今天是{date}，{weekday}，{lunar}。{mbti}{nickname}的你，此刻心情{moodEmoji}{moodLabel}。{brand}杯单已就位，第一杯最适合现在的你。',
  '{lunar} {ganZhi}，{mbti}{nickname}今日适合从{brand}里挑一杯。{moodEmoji}{moodLabel}的状态，适合这份刚刚好的风味。',
  '{date} {weekday}，{lunar}。为{moodEmoji}{moodLabel}的{mbti}{nickname}，从{brand}里选出了今日推荐。',
]

export function recommend(brand: Brand, mood: MoodType, mbti: MbtiType, date?: Date): {
  recommendations: Recommendation[]
  summary: string
  calendarInfo: ReturnType<typeof getCalendarInfo>
  brand: Brand
  mood: MoodType
  mbti: MbtiType
} {
  const targetDate = date ?? new Date()
  const calendarInfo = getCalendarInfo(targetDate, { brand, mood, mbti })
  const season = getSeason(targetDate.getMonth() + 1)

  const recommendations: Recommendation[] = listDrinks({ brand })
    .map((drink) => ({
      drink,
      score: scoreDrink(drink, mood, mbti, season),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ drink, score }, index) => ({
      drink,
      reason: index === 0
        ? generateReason(drink, mood, mbti, calendarInfo.drinkHint)
        : `${drink.description}\n作为备选也很贴合今天的状态。`,
      score,
    }))

  const mbtiProfile = mbtiProfiles.find((p) => p.type === mbti)
  const moodLabels: Record<string, { label: string; emoji: string }> = {
    happy: { label: '开心', emoji: '😄' },
    sad: { label: '低落', emoji: '😔' },
    angry: { label: '烦躁', emoji: '😤' },
    tired: { label: '疲惫', emoji: '🥱' },
    excited: { label: '兴奋', emoji: '🎉' },
    calm: { label: '平静', emoji: '😌' },
    romantic: { label: '恋爱', emoji: '💕' },
    energetic: { label: '充电', emoji: '💪' },
  }
  const moodInfo = moodLabels[mood]

  const templateIndex = (targetDate.getDate()) % SUMMARY_TEMPLATES.length
  const summary = SUMMARY_TEMPLATES[templateIndex]
    .replace('{date}', calendarInfo.date)
    .replace('{weekday}', calendarInfo.weekday)
    .replace('{lunar}', `${calendarInfo.lunarMonth}${calendarInfo.lunarDate}`)
    .replace('{ganZhi}', calendarInfo.ganZhi)
    .replace('{mbti}', mbti)
    .replace('{nickname}', mbtiProfile?.nickname ?? '')
    .replace('{moodEmoji}', moodInfo?.emoji ?? '')
    .replace('{moodLabel}', moodInfo?.label ?? '')
    .replace('{brand}', brandLabels[brand])

  return { recommendations, summary, calendarInfo, brand, mood, mbti }
}
