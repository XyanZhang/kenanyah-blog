'use client'

import { useEffect, useRef } from 'react'

export type FallingParticleType = 'snow' | 'petals' | 'leaves'

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

/** 在 ctx 上绘制六瓣雪花（当前已 translate 到中心） */
function drawSnowflake(ctx: CanvasRenderingContext2D, size: number) {
  ctx.strokeStyle = ctx.fillStyle as string
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

/** 在 ctx 上绘制花瓣形状（泪滴形：一端圆一端略尖，当前已 translate 到中心并旋转） */
function drawPetal(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.beginPath()
  ctx.moveTo(0, h)
  ctx.quadraticCurveTo(w, 0, 0, -h)
  ctx.quadraticCurveTo(-w, 0, 0, h)
  ctx.fill()
}

/** 在 ctx 上绘制叶子形状（长椭圆一端略尖，当前已 translate 到中心并旋转） */
function drawLeaf(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.beginPath()
  ctx.moveTo(0, h)
  ctx.bezierCurveTo(w * 0.8, h * 0.3, w * 0.8, -h * 0.3, 0, -h)
  ctx.bezierCurveTo(-w * 0.8, -h * 0.3, -w * 0.8, h * 0.3, 0, h)
  ctx.fill()
}

export interface FallingParticlesProps {
  /** 飘落类型：雪花 / 花瓣 / 叶子 */
  type?: FallingParticleType
  /** 粒子数量，建议 8–25，过多会显得杂乱 */
  count?: number
  /** 整体不透明度 0–1 */
  opacity?: number
  /** 是否启用（可配合季节/节日关闭） */
  enabled?: boolean
}

export function FallingParticles({
  type = 'petals',
  count = 18,
  opacity = 0.85,
  enabled = true,
}: FallingParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let particles: Particle[] = []
    let time = 0

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
      const spawnZone = h * 1.2

      for (let i = 0; i < baseCount; i++) {
        const size = type === 'snow'
          ? 2.5 + Math.random() * 2.5
          : type === 'petals'
            ? 5 + Math.random() * 6
            : 6 + Math.random() * 8
        const width = type === 'snow' ? size : type === 'petals' ? size * 1.6 : size * 2
        const height = type === 'snow' ? size : type === 'petals' ? size * 1.1 : size * 0.55
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
        ctx.fillStyle = color

        if (p.type === 'snow') {
          drawSnowflake(ctx, p.size)
        } else if (p.type === 'petals') {
          drawPetal(ctx, p.width / 2, p.height / 2)
        } else {
          drawLeaf(ctx, p.width / 2, p.height / 2)
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
      className="fixed inset-0 pointer-events-none z-[1]"
      style={{ width: '100%', height: '100%' }}
      aria-hidden
    />
  )
}
