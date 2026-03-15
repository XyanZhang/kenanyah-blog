'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient, type ApiResponse } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import { useCountdown } from '@/hooks/useCountdown'
import { cn } from '@/lib/utils'

type LoginMode = 'code' | 'password'

interface SendCodeResponse {
  message: string
  cooldownSeconds: number
}

interface LoginResponse {
  user: {
    id: string
    email: string
    username: string
    name: string | null
    role: string
  }
  isNewUser?: boolean
  needsSetup?: boolean
}

export function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<LoginMode>('code')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { seconds: cooldown, start: startCooldown } = useCountdown(0)

  // 发送验证码
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await apiClient
        .post('auth/send-code', { json: { email } })
        .json<ApiResponse<SendCodeResponse>>()

      if (response.success && response.data) {
        startCooldown(response.data.cooldownSeconds)
        setError('')
      } else {
        setError(response.error || '发送验证码失败')
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // 验证码登录
  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await apiClient
        .post('auth/verify-code', { json: { email, code } })
        .json<ApiResponse<LoginResponse>>()

      if (response.success && response.data) {
        if (response.data.needsSetup) {
          router.push('/setup-profile')
        } else {
          router.push('/')
        }
      } else {
        setError(response.error || '验证码错误或已过期')
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // 密码登录
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await apiClient
        .post('auth/login', { json: { email, password } })
        .json<ApiResponse<LoginResponse>>()

      if (response.success && response.data) {
        router.push('/')
      } else {
        setError(response.error || '邮箱或密码错误')
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* 标题 */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-content-primary">欢迎回来</h1>
        <p className="text-sm text-content-muted mt-1">登录您的账户</p>
      </div>

      {/* 登录方式切换 */}
      <div className="flex mb-5 bg-surface-secondary rounded-lg p-1">
        <button
          type="button"
          onClick={() => { setMode('code'); setError('') }}
          className={cn(
            'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
            mode === 'code'
              ? 'bg-surface-primary text-content-primary shadow-sm'
              : 'text-content-muted hover:text-content-primary'
          )}
        >
          验证码登录
        </button>
        <button
          type="button"
          onClick={() => { setMode('password'); setError('') }}
          className={cn(
            'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
            mode === 'password'
              ? 'bg-surface-primary text-content-primary shadow-sm'
              : 'text-content-muted hover:text-content-primary'
          )}
        >
          密码登录
        </button>
      </div>

      {mode === 'code' ? (
        <form onSubmit={handleCodeLogin} className="space-y-4">
          <div>
            <Label htmlFor="email" className="mb-1.5 block">邮箱地址</Label>
            <Input
              id="email"
              type="email"
              placeholder="请输入邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="code">验证码</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSendCode}
                disabled={cooldown > 0 || loading || !email}
                className="h-auto py-1 px-2 text-xs"
              >
                {cooldown > 0 ? `${cooldown}s` : '获取验证码'}
              </Button>
            </div>
            <Input
              id="code"
              type="text"
              placeholder="请输入 6 位验证码"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              className="tracking-widest"
            />
          </div>
          {error && (
            <p className="text-sm text-ui-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
            {loading ? '登录中...' : '登录'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div>
            <Label htmlFor="pwd-email" className="mb-1.5 block">邮箱地址</Label>
            <Input
              id="pwd-email"
              type="email"
              placeholder="请输入邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="password" className="mb-1.5 block">密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-ui-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading || !email || !password}>
            {loading ? '登录中...' : '登录'}
          </Button>
        </form>
      )}
    </div>
  )
}