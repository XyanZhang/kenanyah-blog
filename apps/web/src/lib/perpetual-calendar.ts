import { Solar } from 'lunar-typescript'

export type PerpetualCalendarInfo = {
  dateKey: string
  lunarMonthDay: string
  lunarShortLabel: string
  lunarYearLabel: string
  zodiacLabel: string
  ganzhiYear: string
  ganzhiMonth: string
  ganzhiDay: string
  solarTerm: string
  festivals: string[]
  yi: string[]
  ji: string[]
  chongSha: string
  caiPosition: string
  xiPosition: string
}

function toDateParts(input: Date | string) {
  if (input instanceof Date) {
    return {
      year: input.getFullYear(),
      month: input.getMonth() + 1,
      day: input.getDate(),
    }
  }

  const [year, month, day] = input.slice(0, 10).split('-').map(Number)
  return { year, month, day }
}

function uniqueNonEmpty(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

export function getPerpetualCalendarInfo(input: Date | string): PerpetualCalendarInfo {
  const { year, month, day } = toDateParts(input)
  const solar = Solar.fromYmd(year, month, day)
  const lunar = solar.getLunar()
  const solarTerm = lunar.getJieQi()
  const festivals = uniqueNonEmpty([
    ...solar.getFestivals(),
    ...solar.getOtherFestivals(),
    ...lunar.getFestivals(),
    ...lunar.getOtherFestivals(),
  ])
  const lunarMonthDay = `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`
  const lunarShortLabel = solarTerm || festivals[0] || (lunar.getDay() === 1 ? `${lunar.getMonthInChinese()}月` : lunar.getDayInChinese())

  return {
    dateKey: solar.toYmd(),
    lunarMonthDay,
    lunarShortLabel,
    lunarYearLabel: `${lunar.getYearInChinese()}年`,
    zodiacLabel: `${lunar.getYearShengXiao()}年`,
    ganzhiYear: lunar.getYearInGanZhi(),
    ganzhiMonth: lunar.getMonthInGanZhi(),
    ganzhiDay: lunar.getDayInGanZhi(),
    solarTerm,
    festivals,
    yi: lunar.getDayYi().slice(0, 8),
    ji: lunar.getDayJi().slice(0, 8),
    chongSha: `${lunar.getDayChongDesc()} 煞${lunar.getDaySha()}`,
    caiPosition: lunar.getDayPositionCaiDesc(),
    xiPosition: lunar.getDayPositionXiDesc(),
  }
}
