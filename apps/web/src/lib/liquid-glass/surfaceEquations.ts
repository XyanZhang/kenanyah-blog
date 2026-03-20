/**
 * 玻璃表面高度函数，用于 Liquid Glass 折射计算
 * 参考 https://kube.io/blog/liquid-glass-css-svg/
 */

export type SurfaceFnDef = {
  title: string
  fn: (x: number) => number
}

/** Convex Squircle - Apple 偏好的柔和过渡 */
export const CONVEX: SurfaceFnDef = {
  title: 'Convex Squircle',
  fn: (x) => Math.pow(1 - Math.pow(1 - x, 4), 1 / 4),
}

export const CONVEX_CIRCLE: SurfaceFnDef = {
  title: 'Convex Circle',
  fn: (x) => Math.sqrt(1 - (1 - x) ** 2),
}
