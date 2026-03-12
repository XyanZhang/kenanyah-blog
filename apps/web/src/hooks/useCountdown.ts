'use client'

import { useState, useEffect, useCallback } from 'react'

export function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(false)

  const start = useCallback((newSeconds?: number) => {
    setSeconds(newSeconds ?? initialSeconds)
    setIsRunning(true)
  }, [initialSeconds])

  const reset = useCallback(() => {
    setSeconds(initialSeconds)
    setIsRunning(false)
  }, [initialSeconds])

  useEffect(() => {
    if (!isRunning || seconds <= 0) {
      setIsRunning(false)
      return
    }

    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [isRunning, seconds])

  return { seconds, isRunning, start, reset }
}