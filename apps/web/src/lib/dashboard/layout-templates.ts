import { DashboardCard, DashboardLayout, CardType, CardSize, CardPosition } from '@blog/types'
import { createDefaultCard } from './default-layout'
import { LAYOUT_VERSION, DEFAULT_BORDER_RADIUS, CARD_DIMENSIONS } from '../constants/dashboard'

/**
 * Layout Template Definition
 */
export interface LayoutTemplate {
  id: string
  name: string
  description: string
  icon: string
  preview: string
  cards: Array<{
    type: CardType
    size: CardSize
    position: CardPosition
    borderRadius?: number
    config?: Record<string, unknown>
  }>
}

/**
 * 计算布局的边界框
 */
function calculateBoundingBox(
  cards: Array<{ size: CardSize; position: CardPosition }>
): { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number } {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const card of cards) {
    const dim = CARD_DIMENSIONS[card.size] || CARD_DIMENSIONS.medium
    minX = Math.min(minX, card.position.x)
    maxX = Math.max(maxX, card.position.x + dim.width)
    minY = Math.min(minY, card.position.y)
    maxY = Math.max(maxY, card.position.y + dim.height)
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * 将布局居中（使整体布局的中心点在原点）
 */
function centerLayout(
  cards: Array<{ type: CardType; size: CardSize; position: CardPosition; borderRadius?: number; config?: Record<string, unknown> }>
): Array<{ type: CardType; size: CardSize; position: CardPosition; borderRadius?: number; config?: Record<string, unknown> }> {
  const bbox = calculateBoundingBox(cards)
  const centerX = (bbox.minX + bbox.maxX) / 2
  const centerY = (bbox.minY + bbox.maxY) / 2

  return cards.map((card) => ({
    ...card,
    position: {
      ...card.position,
      x: card.position.x - centerX,
      y: card.position.y - centerY,
    },
  }))
}

/**
 * 1. 经典博客布局 - Classic Blog
 * 左侧个人信息 + 右侧文章列表，传统博客风格
 */
const classicBlogTemplate: LayoutTemplate = {
  id: 'classic-blog',
  name: '经典博客',
  description: '左侧个人信息，右侧文章列表，传统博客风格',
  icon: 'Layout',
  preview: '📝',
  cards: centerLayout([
    {
      type: CardType.PROFILE,
      size: CardSize.MEDIUM,
      position: { x: 0, y: 0, z: 0 },
    },
    {
      type: CardType.STATS,
      size: CardSize.WIDE,
      position: { x: 0, y: 320, z: 1 },
    },
    {
      type: CardType.CATEGORIES,
      size: CardSize.MEDIUM,
      position: { x: 320, y: 0, z: 2 },
    },
    {
      type: CardType.RECENT_POSTS,
      size: CardSize.TALL,
      position: { x: 640, y: 0, z: 3 },
    },
    {
      type: CardType.CALENDAR,
      size: CardSize.MEDIUM,
      position: { x: 320, y: 320, z: 4 },
    },
  ]),
}

/**
 * 2. 极简主义布局 - Minimalist
 * 简约设计，只保留核心元素
 */
const minimalistTemplate: LayoutTemplate = {
  id: 'minimalist',
  name: '极简主义',
  description: '简约设计，只保留核心元素，聚焦内容',
  icon: 'Minus',
  preview: '⚪',
  cards: centerLayout([
    {
      type: CardType.PROFILE,
      size: CardSize.LARGE,
      position: { x: 0, y: 0, z: 0 },
    },
    {
      type: CardType.LATEST_POSTS,
      size: CardSize.TALL,
      position: { x: 420, y: 0, z: 1 },
    },
    {
      type: CardType.CLOCK,
      size: CardSize.MEDIUM,
      position: { x: 50, y: 420, z: 2 },
      config: {
        format24h: true,
        showSeconds: false,
        showDate: true,
        fontStyle: 'sans',
      },
    },
  ]),
}

/**
 * 3. 内容丰富布局 - Content Rich
 * 展示更多内容，适合内容产出者
 */
const contentRichTemplate: LayoutTemplate = {
  id: 'content-rich',
  name: '内容丰富',
  description: '展示更多内容类型，适合内容创作者',
  icon: 'LayoutGrid',
  preview: '📚',
  cards: centerLayout([
    {
      type: CardType.PROFILE,
      size: CardSize.MEDIUM,
      position: { x: 0, y: 0, z: 0 },
    },
    {
      type: CardType.STATS,
      size: CardSize.WIDE,
      position: { x: 320, y: 0, z: 1 },
    },
    {
      type: CardType.CATEGORIES,
      size: CardSize.MEDIUM,
      position: { x: 940, y: 0, z: 2 },
    },
    {
      type: CardType.LATEST_POSTS,
      size: CardSize.TALL,
      position: { x: 0, y: 320, z: 3 },
    },
    {
      type: CardType.RANDOM_POSTS,
      size: CardSize.TALL,
      position: { x: 320, y: 320, z: 4 },
    },
    {
      type: CardType.TABBAR,
      size: CardSize.WIDE,
      position: { x: 640, y: 320, z: 5 },
    },
    {
      type: CardType.CALENDAR,
      size: CardSize.MEDIUM,
      position: { x: 640, y: 640, z: 6 },
    },
    {
      type: CardType.CLOCK,
      size: CardSize.MEDIUM,
      position: { x: 960, y: 640, z: 7 },
    },
  ]),
}

/**
 * 4. 摄影师布局 - Photographer
 * 突出视觉内容，适合摄影/设计师
 */
const photographerTemplate: LayoutTemplate = {
  id: 'photographer',
  name: '摄影师',
  description: '突出视觉内容，适合摄影师和设计师',
  icon: 'Camera',
  preview: '📷',
  cards: centerLayout([
    {
      type: CardType.PROFILE,
      size: CardSize.LARGE,
      position: { x: 0, y: 0, z: 0 },
    },
    {
      type: CardType.LATEST_POSTS,
      size: CardSize.TALL,
      position: { x: 420, y: 0, z: 1 },
      config: {
        limit: 5,
        showImage: true,
        showExcerpt: false,
        showDate: true,
      },
    },
    {
      type: CardType.RANDOM_POSTS,
      size: CardSize.TALL,
      position: { x: 740, y: 0, z: 2 },
      config: {
        limit: 5,
        showImage: true,
        showExcerpt: false,
        showDate: false,
      },
    },
    {
      type: CardType.TABBAR,
      size: CardSize.WIDE,
      position: { x: 0, y: 420, z: 3 },
      config: {
        defaultTab: 'photography',
      },
    },
  ]),
}

/**
 * 5. 仪表盘布局 - Dashboard
 * 数据驱动，展示统计和日历
 */
const dashboardTemplate: LayoutTemplate = {
  id: 'dashboard',
  name: '数据仪表盘',
  description: '数据驱动视图，适合关注数据的用户',
  icon: 'BarChart3',
  preview: '📊',
  cards: centerLayout([
    {
      type: CardType.PROFILE,
      size: CardSize.SMALL,
      position: { x: 0, y: 0, z: 0 },
    },
    {
      type: CardType.STATS,
      size: CardSize.WIDE,
      position: { x: 220, y: 0, z: 1 },
    },
    {
      type: CardType.CLOCK,
      size: CardSize.MEDIUM,
      position: { x: 840, y: 0, z: 2 },
      config: {
        format24h: true,
        showSeconds: true,
        showDate: true,
        fontStyle: 'mono',
      },
    },
    {
      type: CardType.CALENDAR,
      size: CardSize.LARGE,
      position: { x: 0, y: 220, z: 3 },
    },
    {
      type: CardType.CATEGORIES,
      size: CardSize.MEDIUM,
      position: { x: 420, y: 220, z: 4 },
      config: {
        type: 'tags',
        limit: 15,
        showCount: true,
      },
    },
    {
      type: CardType.RECENT_POSTS,
      size: CardSize.TALL,
      position: { x: 740, y: 220, z: 5 },
      config: {
        limit: 8,
        showExcerpt: false,
        showDate: true,
      },
    },
  ]),
}

/**
 * 6. 社交名片布局 - Social Card
 * 突出个人信息，适合个人品牌展示
 */
const socialCardTemplate: LayoutTemplate = {
  id: 'social-card',
  name: '社交名片',
  description: '突出个人品牌，适合社交展示',
  icon: 'UserCircle',
  preview: '👤',
  cards: centerLayout([
    {
      type: CardType.PROFILE,
      size: CardSize.LARGE,
      position: { x: 0, y: 0, z: 0 },
      borderRadius: 50,
    },
    {
      type: CardType.STATS,
      size: CardSize.WIDE,
      position: { x: 0, y: 420, z: 1 },
    },
    {
      type: CardType.TABBAR,
      size: CardSize.WIDE,
      position: { x: 420, y: 0, z: 2 },
    },
    {
      type: CardType.CLOCK,
      size: CardSize.MEDIUM,
      position: { x: 470, y: 320, z: 3 },
      config: {
        format24h: false,
        showSeconds: false,
        showDate: true,
        fontStyle: 'serif',
      },
    },
  ]),
}

/**
 * All available layout templates
 */
export const layoutTemplates: LayoutTemplate[] = [
  classicBlogTemplate,
  minimalistTemplate,
  contentRichTemplate,
  photographerTemplate,
  dashboardTemplate,
  socialCardTemplate,
]

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): LayoutTemplate | undefined {
  return layoutTemplates.find((t) => t.id === id)
}

/**
 * Apply a template to create a DashboardLayout
 */
export function applyTemplate(template: LayoutTemplate): DashboardLayout {
  const now = new Date()

  const cards: DashboardCard[] = template.cards.map((cardDef, index) => {
    const baseCard = createDefaultCard(cardDef.type, cardDef.size, cardDef.config)

    return {
      ...baseCard,
      position: { ...cardDef.position, z: index },
      borderRadius: cardDef.borderRadius ?? DEFAULT_BORDER_RADIUS,
    }
  })

  return {
    id: `layout-${template.id}-${Date.now()}`,
    cards,
    version: LAYOUT_VERSION,
    createdAt: now,
    updatedAt: now,
  }
}
