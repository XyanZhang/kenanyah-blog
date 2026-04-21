import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AdminUser } from '@blog/types'
import { getAdminMe, loginAdmin, logoutAdmin } from '@/lib/api'

type AdminAuthContextValue = {
  user: AdminUser | null
  checked: boolean
  isAuthenticated: boolean
  login: (payload: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [checked, setChecked] = useState(false)

  const refresh = async () => {
    try {
      const result = await getAdminMe()
      setUser(result.data.user)
    } catch {
      setUser(null)
    } finally {
      setChecked(true)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      user,
      checked,
      isAuthenticated: Boolean(user),
      login: async (payload) => {
        const result = await loginAdmin(payload)
        setUser(result.data.user)
        setChecked(true)
      },
      logout: async () => {
        await logoutAdmin()
        setUser(null)
        setChecked(true)
      },
      refresh,
    }),
    [checked, user]
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used inside AdminAuthProvider')
  }
  return context
}
