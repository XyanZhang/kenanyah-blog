import { describe, expect, it } from 'vitest'
import {
  extractTitle,
  inferSourceType,
  inferStatus,
  parseExplicitDate,
} from './calendar-quick-create'

describe('calendar quick-create helpers', () => {
  const now = new Date('2026-04-13T08:00:00.000Z')

  it('infers source type from chinese intent keywords', () => {
    expect(inferSourceType('明天发布一篇 React Compiler 博客')).toBe('post')
    expect(inferSourceType('记录一个想法：把日历做成事件中枢')).toBe('thought')
    expect(inferSourceType('新建一个项目：个人摄影集')).toBe('project')
    expect(inferSourceType('新增一张照片')).toBe('photo')
    expect(inferSourceType('提醒我周五整理资料')).toBe('manual')
  })

  it('extracts relative and explicit dates', () => {
    expect(parseExplicitDate('明天发布博客', now)).toBe('2026-04-14')
    expect(parseExplicitDate('2026-05-01 记录一个项目开始', now)).toBe('2026-05-01')
    expect(parseExplicitDate('4月18日补一张照片', now)).toBe('2026-04-18')
  })

  it('derives safe titles from natural language', () => {
    expect(extractTitle('记录一个想法：把日历做成事件中枢', 'thought')).toBe('把日历做成事件中枢')
    expect(extractTitle('明天发布一篇 React Compiler 调研博客', 'post')).toContain('React Compiler')
  })

  it('keeps post creation conservative', () => {
    expect(inferStatus('今天发布一篇 React Compiler 博客', 'post', '2026-04-13', now)).toBe('planned')
    expect(inferStatus('记录一个想法：统一事件流', 'thought', '2026-04-13', now)).toBe('completed')
    expect(inferStatus('明天开始一个项目', 'project', '2026-04-14', now)).toBe('planned')
  })
})
