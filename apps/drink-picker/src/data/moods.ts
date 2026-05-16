import type { Mood } from '@/types'

export const moods: Mood[] = [
  {
    type: 'happy',
    label: '开心',
    emoji: '😄',
    description: '心情美美哒，来杯好喝的庆祝一下',
  },
  {
    type: 'sad',
    label: '低落',
    emoji: '😔',
    description: '有点小难过，需要一杯温暖治愈',
  },
  {
    type: 'angry',
    label: '烦躁',
    emoji: '😤',
    description: '烦死了，需要冷静一下',
  },
  {
    type: 'tired',
    label: '疲惫',
    emoji: '🥱',
    description: '好累啊，需要一杯提提神',
  },
  {
    type: 'excited',
    label: '兴奋',
    emoji: '🎉',
    description: '超激动！来杯特别的庆祝',
  },
  {
    type: 'calm',
    label: '平静',
    emoji: '😌',
    description: '岁月静好，来杯安静的',
  },
  {
    type: 'romantic',
    label: '恋爱',
    emoji: '💕',
    description: '甜甜的，像恋爱一样',
  },
  {
    type: 'energetic',
    label: '充电',
    emoji: '💪',
    description: '满血复活，来杯给力的',
  },
]
