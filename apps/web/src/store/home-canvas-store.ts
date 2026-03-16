'use client'

import { create } from 'zustand'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants/dashboard'

interface HomeCanvasState {
  scale: number
  translateX: number
  translateY: number
  viewportWidth: number
  viewportHeight: number
  /** 是否已经用真实视口尺寸做过一次同步，避免首页首屏从默认 1920x1080 跳到实际尺寸时出现视觉位移 */
  hasRealViewport: boolean
  setViewportSize: (width: number, height: number) => void
  setScale: (scale: number) => void
}

/** 根据视口与缩放计算平移，使画布中心始终对齐视口中心 */
function computeTranslate(
  vw: number,
  vh: number,
  scale: number
): { translateX: number; translateY: number } {
  return {
    translateX: vw / 2 - (CANVAS_WIDTH * scale) / 2,
    translateY: vh / 2 - (CANVAS_HEIGHT * scale) / 2,
  }
}

/** 固定初始视口，保证 SSR 与客户端首屏一致，避免 hydration 不匹配；真实尺寸在 mount 后由 Dashboard 的 useEffect 更新 */
const INITIAL_VIEWPORT = { w: 1920, h: 1080 }
const initialTranslate = computeTranslate(INITIAL_VIEWPORT.w, INITIAL_VIEWPORT.h, 1)

export const useHomeCanvasStore = create<HomeCanvasState>()((set) => ({
  scale: 1,
  translateX: initialTranslate.translateX,
  translateY: initialTranslate.translateY,
  viewportWidth: INITIAL_VIEWPORT.w,
  viewportHeight: INITIAL_VIEWPORT.h,
  hasRealViewport: false,

  setViewportSize: (width, height) => {
    set((state) => {
      const { translateX, translateY } = computeTranslate(width, height, state.scale)
      return {
        viewportWidth: width,
        viewportHeight: height,
        translateX,
        translateY,
        hasRealViewport: true,
      }
    })
  },

  setScale: (scale) => {
    set((state) => {
      const { translateX, translateY } = computeTranslate(
        state.viewportWidth,
        state.viewportHeight,
        scale
      )
      return { scale, translateX, translateY }
    })
  },
}))
