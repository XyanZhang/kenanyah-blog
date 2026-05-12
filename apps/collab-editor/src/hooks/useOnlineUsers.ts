import { useEffect, useState } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'

export type OnlineUser = {
  clientId: number
  name: string
  color: string
}

export function useOnlineUsers(provider: HocuspocusProvider | null) {
  const [users, setUsers] = useState<OnlineUser[]>([])

  useEffect(() => {
    if (!provider) {
      setUsers([])
      return
    }

    const awareness = provider.awareness
    if (!awareness) {
      setUsers([])
      return
    }

    const syncUsers = () => {
      const nextUsers = Array.from(awareness.getStates().entries())
        .map(([clientId, state]) => {
          const user = state.user as { name?: string; color?: string } | undefined
          if (!user?.name || !user.color) return null
          return { clientId, name: user.name, color: user.color }
        })
        .filter((user): user is OnlineUser => Boolean(user))

      setUsers(nextUsers)
    }

    syncUsers()
    awareness.on('change', syncUsers)

    return () => {
      awareness.off('change', syncUsers)
    }
  }, [provider])

  return users
}
