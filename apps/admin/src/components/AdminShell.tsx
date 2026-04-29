import type { ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useAdminAuth } from '@/providers/AdminAuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import { Button } from './ui'

const items = [
  { to: '/', label: 'Dashboard' },
  { to: '/posts', label: 'Posts' },
  { to: '/comments', label: 'Comments' },
  { to: '/bookmarks', label: 'Bookmarks' },
  { to: '/thoughts', label: 'Thoughts' },
  { to: '/projects', label: 'Projects' },
  { to: '/photos', label: 'Photos' },
  { to: '/taxonomy', label: 'Taxonomy' },
  { to: '/media', label: 'Media' },
]

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAdminAuth()
  const { theme, setTheme } = useTheme()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <div className="h-screen overflow-hidden">
      <div className="mx-auto flex h-screen max-w-[1500px] gap-4 px-3 py-3 lg:px-4">
        <aside className="admin-panel hidden h-full w-60 shrink-0 rounded-2xl p-4 lg:flex lg:flex-col">
          <div className="mb-6">
            <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Blog Admin</p>
            <h1 className="mt-2 text-[22px] font-semibold text-[var(--text)]">Editorial Desk</h1>
            <p className="mt-2 max-w-[22ch] text-sm leading-6 text-[var(--text-soft)]">A tighter workspace for publishing, moderation, and taxonomy upkeep.</p>
          </div>

          <nav className="space-y-1.5">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`block rounded-xl px-3 py-2.5 text-sm transition ${
                  pathname === item.to
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-soft)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 rounded-xl bg-[var(--bg-elevated)] p-2">
            <div className="grid grid-cols-2 gap-1">
              <button
                className={`rounded-lg px-3 py-2 text-xs font-medium ${theme === 'light' ? 'bg-[var(--surface-strong)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)]'}`}
                onClick={() => setTheme('light')}
                type="button"
              >
                Light
              </button>
              <button
                className={`rounded-lg px-3 py-2 text-xs font-medium ${theme === 'dark' ? 'bg-[var(--surface-strong)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)]'}`}
                onClick={() => setTheme('dark')}
                type="button"
              >
                Dark
              </button>
            </div>
          </div>

          <div className="mt-auto rounded-xl bg-[var(--bg-elevated)] p-3">
            <p className="text-sm font-medium text-[var(--text)]">{user?.name ?? 'Admin'}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{user?.email}</p>
            <Button className="mt-3 w-full" variant="ghost" onClick={() => void logout()}>
              Log out
            </Button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="admin-panel mb-4 flex items-center justify-between rounded-2xl px-4 py-3 lg:hidden">
            <div>
              <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Admin</p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">{pathname}</p>
            </div>
            <Button variant="ghost" onClick={() => void logout()}>
              Logout
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
