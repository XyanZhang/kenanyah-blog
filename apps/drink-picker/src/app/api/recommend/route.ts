import { NextResponse } from 'next/server'
import { z } from 'zod'
import { recommend } from '@/lib/recommend'
import type { Brand, MbtiType, MoodType } from '@/types'

const recommendSchema = z.object({
  brand: z.enum(['luckin', 'cotti', 'starbucks']),
  mood: z.enum([
    'happy', 'sad', 'angry', 'tired',
    'excited', 'calm', 'romantic', 'energetic',
  ]),
  mbti: z.enum([
    'INTJ', 'INTP', 'ENTJ', 'ENTP',
    'INFJ', 'INFP', 'ENFJ', 'ENFP',
    'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
    'ISTP', 'ISFP', 'ESTP', 'ESFP',
  ]),
  date: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = recommendSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: '参数错误', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { brand, mood, mbti, date } = parsed.data
    const targetDate = date ? new Date(date) : undefined

    if (targetDate && isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { success: false, error: '日期格式错误' },
        { status: 400 },
      )
    }

    const result = recommend(brand as Brand, mood as MoodType, mbti as MbtiType, targetDate)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 },
    )
  }
}
