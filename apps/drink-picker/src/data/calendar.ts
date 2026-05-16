import type { Brand, CalendarInfo, MbtiType, MoodType, Season } from '@/types'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const YI_ITEMS = [
  '喝咖啡', '品奶茶', '约朋友', '摸鱼', '加班', '约会', '逛街',
  '追剧', '运动', '学习', '发呆', '拍照', '听歌', '撸猫',
]
const JI_ITEMS = [
  '减肥', '熬夜', '冲动消费', '吵架', '犹豫不决', '躺平', '内耗',
]

const DRINK_HINTS = [
  '今日宜喝咖啡，贵人运加持 ☕',
  '星运提示：来杯奶茶可转运 🧋',
  '今日水逆，建议来杯冰饮冷静一下 🧊',
  '大吉日！想喝什么就喝什么！🎉',
  '今日桃花运旺，建议点情侣款 💕',
  '财神爷说今天该请自己喝一杯 💰',
  '今日能量低迷，需要咖啡因续命 ⚡',
  '吉日！适合尝试新品，有惊喜 🎁',
  '今日适合温热饮品，暖暖更健康 🌡️',
  '社交运爆棚，适合约人拼单 👥',
]

interface CalendarContext {
  brand?: Brand
  mood?: MoodType
  mbti?: MbtiType
}

const BRAND_RULES: Record<Brand, { yi: string[]; ji: string[]; hint: string }> = {
  luckin: {
    yi: ['尝试新品', '轻甜拿铁', '通勤续命'],
    ji: ['选择困难', '空腹猛灌'],
    hint: '今天适合从瑞幸里挑一杯轻快、不费脑的日常款',
  },
  cotti: {
    yi: ['高性价比', '果咖尝鲜', '顺手拼单'],
    ji: ['过度纠结', '临时加糖'],
    hint: '今天适合从库迪里选一杯轻松、划算、有点新鲜感的饮品',
  },
  starbucks: {
    yi: ['慢喝一杯', '经典菜单', '找个座位'],
    ji: ['赶时间外带', '盲点超甜'],
    hint: '今天适合从星巴克里选一杯稳定、经典、能慢慢喝的饮品',
  },
}

const MOOD_RULES: Record<MoodType, { yi: string[]; ji: string[]; hint: string }> = {
  happy: {
    yi: ['甜口奖励', '分享杯单'],
    ji: ['扫兴比较'],
    hint: '心情在线，适合来一点有记忆点的风味奖励自己',
  },
  sad: {
    yi: ['温热治愈', '奶香安抚'],
    ji: ['冰饮刺激', '苦味拉满'],
    hint: '今天需要柔和一点，温暖和奶香会比强刺激更合拍',
  },
  angry: {
    yi: ['清爽降火', '少糖冷静'],
    ji: ['高糖上头', '冲动加购'],
    hint: '烦躁的时候先降温，清爽低负担的选择更稳',
  },
  tired: {
    yi: ['咖啡因续命', '少冰提神'],
    ji: ['无咖啡因', '熬夜加码'],
    hint: '能量偏低，今天需要一杯真正能把状态拉起来的',
  },
  excited: {
    yi: ['限定尝鲜', '冰爽口感'],
    ji: ['保守点单'],
    hint: '兴奋感适合配一点新鲜和清爽，让快乐继续往上走',
  },
  calm: {
    yi: ['经典款', '低糖慢喝'],
    ji: ['重口刺激'],
    hint: '平静的一天适合经典、干净、慢慢喝完的风味',
  },
  romantic: {
    yi: ['甜香风味', '双杯分享'],
    ji: ['苦到皱眉'],
    hint: '今天的氛围适合甜一点、香一点，也适合分享',
  },
  energetic: {
    yi: ['浓缩加持', '清爽提速'],
    ji: ['奶油负担'],
    hint: '状态很满，适合一杯干脆、有推进感的饮品',
  },
}

const MBTI_RULES: Record<string, { yi: string[]; ji: string[] }> = {
  I: { yi: ['独处慢喝'], ji: ['社交硬拼'] },
  E: { yi: ['约人同饮'], ji: ['独自内耗'] },
  N: { yi: ['新品灵感'], ji: ['重复无聊'] },
  S: { yi: ['稳定口味'], ji: ['盲目猎奇'] },
  T: { yi: ['低糖清醒'], ji: ['情绪化下单'] },
  F: { yi: ['治愈口感'], ji: ['苦味硬撑'] },
  J: { yi: ['直接下单'], ji: ['临时改来改去'] },
  P: { yi: ['随性加料'], ji: ['选择拖延'] },
}

function getChineseCalendarInfo(date: Date): { lunarMonth: string; lunarDay: string; ganZhi: string } {
  try {
    const lunarDate = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      month: 'long',
      day: 'numeric',
    }).format(date)
    const lunarYear = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      year: 'numeric',
    }).format(date)
    const matched = lunarDate.match(/^(.+?)(\d+日|[初十廿卅一二三四五六七八九]+)$/)

    return {
      lunarMonth: matched?.[1] ?? lunarDate,
      lunarDay: matched?.[2] ?? '',
      ganZhi: lunarYear.replace(/^\d+/, ''),
    }
  } catch {
    return {
      lunarMonth: '',
      lunarDay: '',
      ganZhi: '',
    }
  }
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function pickSeeded<T>(arr: T[], count: number, seed: number): T[] {
  const shuffled = [...arr].sort((a, b) => seededRandom(seed + arr.indexOf(a)) - seededRandom(seed + arr.indexOf(b)))
  return shuffled.slice(0, count)
}

function appendUnique(items: string[], additions: string[]): string[] {
  const next = [...items]
  additions.forEach((item) => {
    if (!next.includes(item)) {
      next.push(item)
    }
  })
  return next
}

function getSeasonRules(season: Season): { yi: string[]; ji: string[]; hint: string } {
  if (season === 'summer') {
    return { yi: ['冰爽清口', '轻乳轻糖'], ji: ['热饮硬撑'], hint: '季节偏热，清爽和轻负担会更舒服' }
  }
  if (season === 'winter') {
    return { yi: ['热饮暖身', '厚乳口感'], ji: ['冰到发抖'], hint: '天气偏冷，温热和醇厚会更贴今天' }
  }
  if (season === 'spring') {
    return { yi: ['花香茶感', '清新拿铁'], ji: ['过甜腻口'], hint: '春天适合轻盈一点，花香和茶感会更出彩' }
  }
  return { yi: ['坚果焦糖', '醇厚回甘'], ji: ['酸感过强'], hint: '秋天适合更圆润的香气，醇厚款更稳' }
}

function buildCalendarRules(daySeed: number, season: Season, context?: CalendarContext): {
  yi: string[]
  ji: string[]
  drinkHint: string
} {
  const seasonRules = getSeasonRules(season)
  let yi: string[] = []
  let ji: string[] = []
  let hints: string[] = []

  if (context?.mood) {
    const moodRules = MOOD_RULES[context.mood]
    yi = appendUnique(yi, moodRules.yi)
    ji = appendUnique(ji, moodRules.ji)
    hints.push(moodRules.hint)
  }

  if (context?.brand) {
    const brandRules = BRAND_RULES[context.brand]
    yi = appendUnique(yi, brandRules.yi)
    ji = appendUnique(ji, brandRules.ji)
    hints.push(brandRules.hint)
  }

  if (context?.mbti) {
    context.mbti.split('').forEach((dimension) => {
      const mbtiRules = MBTI_RULES[dimension]
      if (mbtiRules) {
        yi = appendUnique(yi, mbtiRules.yi)
        ji = appendUnique(ji, mbtiRules.ji)
      }
    })
  }

  yi = appendUnique(yi, seasonRules.yi)
  ji = appendUnique(ji, seasonRules.ji)
  hints = appendUnique(hints, [seasonRules.hint])

  yi = appendUnique(yi, pickSeeded(YI_ITEMS, 3, daySeed)).slice(0, 3)
  ji = appendUnique(ji, pickSeeded(JI_ITEMS, 2, daySeed + 100)).slice(0, 2)

  return {
    yi,
    ji,
    drinkHint: hints[Math.floor(seededRandom(daySeed + yi.length + ji.length) * hints.length)] ?? DRINK_HINTS[daySeed % DRINK_HINTS.length],
  }
}

export function getCalendarInfo(date?: Date, context?: CalendarContext): CalendarInfo {
  const targetDate = date ?? new Date()
  const lunar = getChineseCalendarInfo(targetDate)
  const daySeed = targetDate.getFullYear() * 10000 + (targetDate.getMonth() + 1) * 100 + targetDate.getDate()
  const season = getSeason(targetDate.getMonth() + 1)

  const rules = buildCalendarRules(daySeed, season, context)

  return {
    date: `${targetDate.getMonth() + 1}月${targetDate.getDate()}日`,
    weekday: `星期${WEEKDAYS[targetDate.getDay()]}`,
    lunarDate: lunar.lunarDay,
    lunarMonth: lunar.lunarMonth,
    ganZhi: lunar.ganZhi,
    yi: rules.yi,
    ji: rules.ji,
    drinkHint: rules.drinkHint,
  }
}

export function getSeason(month: number): 'spring' | 'summer' | 'autumn' | 'winter' {
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}
