import { useState } from 'react'
import { useAdminAuth } from '@/providers/AdminAuthProvider'
import { Card, Button, Input } from '@/components/ui'

export function LoginPage() {
  const { login } = useAdminAuth()
  const [email, setEmail] = useState('admin@admin.com')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ email, password })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <Card className="w-full max-w-md p-6">
        <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Admin Portal</p>
        <h1 className="mt-3 text-[30px] font-semibold leading-tight text-[var(--text)]">Sign in to manage content</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">Use the separate admin account to access the dashboard.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm text-[var(--text-soft)]">Email</label>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-[var(--text-soft)]">Password</label>
            <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </div>
          {error ? <p className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p> : null}
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
