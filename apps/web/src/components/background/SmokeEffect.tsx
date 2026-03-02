'use client'

import { useEffect, useRef } from 'react'

export function SmokeEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let time = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resize()
    window.addEventListener('resize', resize)

    const particles: Array<{
      x: number
      y: number
      radius: number
      speedX: number
      speedY: number
      opacity: number
      phase: number
    }> = []

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 150 + Math.random() * 250,
        speedX: (Math.random() - 0.5) * 1.5,
        speedY: -0.5 - Math.random() * 1,
        opacity: 0.03 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
      })
    }

    const drawSmoke = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      time += 0.01

      particles.forEach((p) => {
        p.x += p.speedX + Math.sin(time + p.phase) * 0.8
        p.y += p.speedY + Math.cos(time * 0.7 + p.phase) * 0.5

        if (p.y + p.radius < 0) {
          p.y = canvas.height + p.radius
          p.x = Math.random() * canvas.width
        }
        if (p.x < -p.radius) p.x = canvas.width + p.radius
        if (p.x > canvas.width + p.radius) p.x = -p.radius

        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.radius
        )
        gradient.addColorStop(0, `rgba(140, 140, 160, ${p.opacity})`)
        gradient.addColorStop(0.4, `rgba(120, 120, 140, ${p.opacity * 0.6})`)
        gradient.addColorStop(1, 'rgba(80, 80, 100, 0)')

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      })

      animationId = requestAnimationFrame(drawSmoke)
    }

    drawSmoke()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ width: '100%', height: '100%' }}
    />
  )
}
