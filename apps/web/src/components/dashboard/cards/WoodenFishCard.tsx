'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DashboardCard } from '@blog/types'

interface WoodenFishCardProps {
  card: DashboardCard
}

/** 功德+1 飘字项 */
interface MeritPopup {
  id: number
  offsetX: number
}

/** Q版木鱼卡片：嵌入 Dashboard 的敲木鱼组件 */
export function WoodenFishCard({ card: _card }: WoodenFishCardProps) {
  const [meritPopups, setMeritPopups] = useState<MeritPopup[]>([])
  const [idCounter, setIdCounter] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const hoverFiredRef = useRef(false)

  const addMerit = useCallback(() => {
    const id = idCounter
    setIdCounter((c) => c + 1)
    const offsetX = (Math.random() - 0.5) * 24
    setMeritPopups((prev) => [...prev, { id, offsetX }])
    setTimeout(() => {
      setMeritPopups((prev) => prev.filter((p) => p.id !== id))
    }, 800)
  }, [idCounter])

  const handleClick = useCallback(() => addMerit(), [addMerit])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    if (!hoverFiredRef.current) {
      hoverFiredRef.current = true
      addMerit()
    }
  }, [addMerit])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    hoverFiredRef.current = false
  }, [])

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2" aria-label="敲木鱼积功德">
      {/* 功德+1 飘字层 */}
      <div className="pointer-events-none relative h-16 w-24 overflow-visible">
        <AnimatePresence>
          {meritPopups.map((popup) => (
            <motion.span
              key={popup.id}
              className="absolute left-1/2 bottom-0 whitespace-nowrap font-bold text-accent-primary"
              style={{
                marginLeft: popup.offsetX,
                fontFamily: 'var(--font-motto)',
                fontSize: '0.95rem',
                textShadow: '0 1px 2px rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,0.6)',
              }}
              transformTemplate={(_, t) => `translateX(-50%) ${t}`}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{
                opacity: 1,
                y: -40,
                scale: 1.2,
                transition: { duration: 0.25, ease: 'easeOut' },
              }}
              exit={{
                opacity: 0,
                y: -60,
                scale: 1,
                transition: { duration: 0.4 },
              }}
            >
              功德+1
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Q版木鱼 */}
      <motion.button
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="group relative flex cursor-pointer select-none items-center justify-center rounded-full p-1 transition-transform active:scale-90"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        aria-label="敲木鱼"
      >
        <motion.div
          animate={
            isHovered
              ? {
                  rotate: [-2, 2, -2],
                  transition: { duration: 0.15, repeat: 2 },
                }
              : {}
          }
          className="relative"
        >
          <svg
            width="56"
            height="48"
            viewBox="0 0 56 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-md"
          >
            <ellipse
              cx="28"
              cy="28"
              rx="24"
              ry="18"
              fill="url(#woodenFishBodyCard)"
              stroke="#8B5A2B"
              strokeWidth="1.5"
              className="transition-transform group-hover:scale-[1.02]"
            />
            <path
              d="M12 28 Q20 24 28 28 Q36 32 44 28"
              stroke="#A67C52"
              strokeWidth="1"
              strokeOpacity="0.6"
              fill="none"
            />
            <path
              d="M14 32 Q22 28 28 32 Q34 36 42 32"
              stroke="#A67C52"
              strokeWidth="0.8"
              strokeOpacity="0.4"
              fill="none"
            />
            <ellipse cx="20" cy="24" rx="5" ry="6" fill="#2D1810" />
            <ellipse cx="20" cy="23" rx="2" ry="2.5" fill="#fff" opacity="0.8" />
            <path
              d="M8 30 Q12 34 16 30"
              stroke="#5D3A1A"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M48 24 L54 20 L54 28 L48 24"
              fill="url(#woodenFishTailCard)"
              stroke="#8B5A2B"
              strokeWidth="1"
            />
            <ellipse
              cx="28"
              cy="38"
              rx="10"
              ry="4"
              fill="#6B4423"
              stroke="#5D3A1A"
              strokeWidth="1"
            />
            <defs>
              <linearGradient
                id="woodenFishBodyCard"
                x1="4"
                y1="10"
                x2="52"
                y2="46"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#D4A574" />
                <stop offset="0.4" stopColor="#C4956A" />
                <stop offset="0.7" stopColor="#A67C52" />
                <stop offset="1" stopColor="#8B6342" />
              </linearGradient>
              <linearGradient
                id="woodenFishTailCard"
                x1="48"
                y1="20"
                x2="54"
                y2="28"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#B8865B" />
                <stop offset="1" stopColor="#8B6342" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      </motion.button>
    </div>
  )
}
