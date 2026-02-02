'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface FloatingActionsContextType {
  extraActions: ReactNode | null
  setExtraActions: (actions: ReactNode | null) => void
}

const FloatingActionsContext = createContext<FloatingActionsContextType | null>(null)

export function FloatingActionsProvider({ children }: { children: ReactNode }) {
  const [extraActions, setExtraActions] = useState<ReactNode | null>(null)

  return (
    <FloatingActionsContext.Provider value={{ extraActions, setExtraActions }}>
      {children}
    </FloatingActionsContext.Provider>
  )
}

export function useFloatingActions() {
  const context = useContext(FloatingActionsContext)
  if (!context) {
    throw new Error('useFloatingActions must be used within FloatingActionsProvider')
  }
  return context
}
