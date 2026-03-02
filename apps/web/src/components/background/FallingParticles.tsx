'use client'

import { useEffect, useRef } from 'react'

export type FallingParticleType = 'snow' | 'petals' | 'leaves'

/** 按类型管理的配置：尺寸范围与内置绘制函数 */
type ParticleDrawer = (
  ctx: CanvasRenderingContext2D,
  size: number,
  width: number,
  height: number,
  color: string
) => void

function parseCssColor(value: string, alpha: number): string {
  const v = value.trim()
  if (!v) return `rgba(156,163,175,${alpha})`
  if (v.startsWith('rgba') || v.startsWith('rgb')) return v
  const hex = v.replace(/^#/, '')
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  return `rgba(156,163,175,${alpha})`
}

function getThemeColors(): { primary: string; secondary: string; dim: string } {
  if (typeof document === 'undefined') {
    return { primary: 'rgba(147,51,234,0.55)', secondary: 'rgba(37,99,235,0.45)', dim: 'rgba(156,163,175,0.65)' }
  }
  const style = getComputedStyle(document.documentElement)
  const primary = style.getPropertyValue('--theme-accent-primary').trim() || '#9333ea'
  const secondary = style.getPropertyValue('--theme-accent-secondary').trim() || '#2563eb'
  const dim = style.getPropertyValue('--theme-text-dim').trim() || '#9ca3af'
  return {
    primary: parseCssColor(primary, 0.55),
    secondary: parseCssColor(secondary, 0.45),
    dim: parseCssColor(dim, 0.65),
  }
}

interface Particle {
  x: number
  y: number
  size: number
  speedY: number
  speedX: number
  wobblePhase: number
  wobbleAmp: number
  rotation: number
  rotationSpeed: number
  type: FallingParticleType
  colorIndex: number
  width: number
  height: number
}

function drawSnowflakeShape(ctx: CanvasRenderingContext2D, size: number, _w: number, _h: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(0.8, size * 0.25)
  ctx.lineCap = 'round'
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size)
    ctx.stroke()
    const endX = Math.cos(a) * size
    const endY = Math.sin(a) * size
    ctx.beginPath()
    ctx.moveTo(endX, endY)
    ctx.lineTo(endX + Math.cos(a + 0.6) * size * 0.4, endY + Math.sin(a + 0.6) * size * 0.4)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(endX, endY)
    ctx.lineTo(endX + Math.cos(a - 0.6) * size * 0.4, endY + Math.sin(a - 0.6) * size * 0.4)
    ctx.stroke()
  }
}

function drawPetalShape(ctx: CanvasRenderingContext2D, _size: number, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, h)
  ctx.quadraticCurveTo(w, 0, 0, -h)
  ctx.quadraticCurveTo(-w, 0, 0, h)
  ctx.fill()
}

function drawLeafShape(ctx: CanvasRenderingContext2D, _size: number, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, h)
  ctx.bezierCurveTo(w * 0.8, h * 0.3, w * 0.8, -h * 0.3, 0, -h)
  ctx.bezierCurveTo(-w * 0.8, -h * 0.3, -w * 0.8, h * 0.3, 0, h)
  ctx.fill()
}

/** 多种类型用 Map 管理：类型 -> 内置绘制函数 + 尺寸范围 */
export const PARTICLE_TYPE_MAP = new Map<FallingParticleType, { drawer: ParticleDrawer; sizeRange: [number, number]; widthScale: number; heightScale: number }>([
  ['snow', { drawer: drawSnowflakeShape, sizeRange: [2.5, 5], widthScale: 1, heightScale: 1 }],
  ['petals', { drawer: drawPetalShape, sizeRange: [4, 22], widthScale: 1.6, heightScale: 1.1 }],
  ['leaves', { drawer: drawLeafShape, sizeRange: [6, 14], widthScale: 2, heightScale: 0.55 }],
])

export interface FallingParticlesProps {
  /** 飘落类型：雪花 / 花瓣 / 叶子 */
  type?: FallingParticleType
  /** 可选：按类型映射图片 URL，传入后该类型使用图片绘制而非内置形状 */
  images?: Partial<Record<FallingParticleType, string>>
  /** 粒子数量，建议 8–25 */
  count?: number
  /** 整体不透明度 0–1 */
  opacity?: number
  /** 是否启用 */
  enabled?: boolean
}

export function FallingParticles({
  type = 'petals',
  images: imagesProp,
  count = 18,
  opacity = 0.85,
  enabled = true,
}: FallingParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesLoadedRef = useRef<Map<FallingParticleType, HTMLImageElement>>(new Map())

  /** 将图片中与背景色、马赛克/棋盘格相近的像素设为透明 */
  const stripImageBackground = (img: HTMLImageElement): Promise<HTMLImageElement> => {
    return new Promise<HTMLImageElement>((resolve) => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (!w || !h) {
        resolve(img)
        return
      }
      const off = document.createElement('canvas')
      off.width = w
      off.height = h
      const octx = off.getContext('2d', { willReadFrequently: false })
      if (!octx) {
        resolve(img)
        return
      }
      octx.drawImage(img, 0, 0)
      const data = octx.getImageData(0, 0, w, h)
      const d = data.data
      const sample = (x: number, y: number) => {
        const i = (y * w + x) * 4
        return [d[i], d[i + 1], d[i + 2], d[i + 3]] as const
      }
      const tolerance = 36
      const alphaTolerance = 40
      const corners: Array<readonly [number, number, number, number]> = [
        sample(0, 0),
        sample(w - 1, 0),
        sample(0, h - 1),
        sample(w - 1, h - 1),
      ]
      const bgColors = [...corners]
      const isSimilar = (
        r: number,
        g: number,
        b: number,
        a: number,
        r0: number,
        g0: number,
        b0: number,
        a0: number
      ) =>
        Math.abs(r - r0) <= tolerance &&
        Math.abs(g - g0) <= tolerance &&
        Math.abs(b - b0) <= tolerance &&
        (a0 < alphaTolerance || Math.abs(a - a0) <= alphaTolerance)
      const isBackground = (r: number, g: number, b: number, a: number) => {
        if (a < 16) return true
        for (const [r0, g0, b0, a0] of bgColors) {
          if (isSimilar(r, g, b, a, r0, g0, b0, a0)) return true
        }
        const lum = (r * 299 + g * 587 + b * 114) / 1000
        if (lum >= 240 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) return true
        if (lum >= 200 && lum < 240 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25) return true
        return false
      }
      for (let i = 0; i < d.length; i += 4) {
        if (isBackground(d[i], d[i + 1], d[i + 2], d[i + 3])) d[i + 3] = 0
      }
      octx.putImageData(data, 0, 0)
      const out = new Image()
      out.onload = () => resolve(out)
      out.onerror = () => resolve(img)
      try {
        out.src = off.toDataURL('image/png')
      } catch {
        resolve(img)
      }
    })
  }

  useEffect(() => {
    const map = imagesLoadedRef.current
    map.clear()
    if (!imagesProp || Object.keys(imagesProp).length === 0) return

    (Object.entries(imagesProp) as [FallingParticleType, string][]).forEach(([key, src]) => {
      if (!src) return
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        stripImageBackground(img).then((cleaned) => map.set(key, cleaned))
      }
      img.src = src
    })
    return () => map.clear()
  }, [imagesProp])

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const typeConfig = PARTICLE_TYPE_MAP.get(type)

    console.log('typeConfig', typeConfig)

    if (!typeConfig) return
    const config = typeConfig

    let animationId: number
    let particles: Particle[] = []
    let time = 0
    const imageMap = imagesLoadedRef.current

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    function initParticles() {
      particles = []
      const w = canvas!.width
      const h = canvas!.height
      const baseCount = Math.min(count, Math.floor((w * h) / 35000))
      const [sizeMin, sizeMax] = config.sizeRange
      const spawnZone = Math.min(h * 0.4, 280)

      for (let i = 0; i < baseCount; i++) {
        const size = sizeMin + Math.random() * (sizeMax - sizeMin)
        const width = size * config.widthScale
        const height = size * config.heightScale
        particles.push({
          x: Math.random() * w,
          y: -height * 2 - Math.random() * spawnZone,
          size,
          width,
          height,
          speedY: 0.08 + Math.random() * 0.12,
          speedX: (Math.random() - 0.5) * 0.15,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleAmp: 8 + Math.random() * 12,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.004,
          type,
          colorIndex: Math.floor(Math.random() * 3),
        })
      }
    }

    const draw = () => {
      const w = canvas!.width
      const h = canvas!.height
      ctx.clearRect(0, 0, w, h)
      time += 0.016

      const colors = getThemeColors()
      const colorList = [colors.primary, colors.secondary, colors.dim]

      particles.forEach((p) => {
        p.y += p.speedY
        p.x += p.speedX + Math.sin(time * 0.4 + p.wobblePhase) * (p.wobbleAmp * 0.008)
        p.rotation += p.rotationSpeed

        if (p.y > h + p.height * 2) {
          p.y = -p.height * 2 - Math.random() * 200
          p.x = Math.random() * w
        }
        if (p.x < -p.width * 2) p.x = w + p.width * 2
        if (p.x > w + p.width * 2) p.x = -p.width * 2

        const color = colorList[p.colorIndex]
        const fadeIn = Math.max(0, Math.min(1, (p.y + 50) / 50))
        const alpha = opacity * fadeIn * (0.7 + 0.2 * Math.sin(time * 0.3 + p.wobblePhase))
        ctx.save()
        ctx.globalAlpha = Math.min(1, alpha)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)

        const img = imageMap.get(p.type)
        if (img?.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -p.width / 2, -p.height / 2, p.width, p.height)
        } else {
          config.drawer(ctx, p.size, p.width / 2, p.height / 2, color)
        }

        ctx.restore()
      })

      animationId = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [type, count, opacity, enabled])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-1"
      style={{ width: '100%', height: '100%' }}
      aria-hidden
    />
  )
}
