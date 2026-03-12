'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient, type ApiResponse } from '@/lib/api-client'

interface SetupProfileResponse {
  user: {
    id: string
    email: string
    username: string
    name: string | null
    role: string
  }
}

export function SetupProfileForm() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (username.length < 3) {
      newErrors.username = '用户名至少 3 个字符'
    } else if (username.length > 30) {
      newErrors.username = '用户名最多 30 个字符'
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      newErrors.username = '用户名只能包含字母、数字、下划线和连字符'
    }

    if (password.length < 8) {
      newErrors.password = '密码至少 8 个字符'
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = '密码必须包含至少一个大写字母'
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = '密码必须包含至少一个小写字母'
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = '密码必须包含至少一个数字'
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)
    try {
      const response = await apiClient
        .post('auth/setup-profile', {
          json: { username, password, name: name || undefined },
        })
        .json<ApiResponse<SetupProfileResponse>>()

      if (response.success) {
        router.push('/')
      } else {
        setErrors({ submit: response.error || '设置失败，用户名可能已被使用' })
      }
    } catch (err) {
      const error = err as Error & { message?: string }
      setErrors({ submit: error.message || '设置失败，用户名可能已被使用' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* 标题 */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-content-primary">完善信息</h1>
        <p className="text-sm text-content-muted mt-1">首次登录需要设置用户名和密码</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="username" className="mb-1.5 block">用户名 *</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
            required
            autoFocus
          />
          {errors.username && (
            <p className="text-sm text-ui-destructive mt-1">{errors.username}</p>
          )}
        </div>

        <div>
          <Label htmlFor="password" className="mb-1.5 block">密码 *</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            required
          />
          {errors.password ? (
            <p className="text-sm text-ui-destructive mt-1">{errors.password}</p>
          ) : (
            <p className="text-xs text-content-muted mt-1">
              至少 8 位，包含大小写字母和数字
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="mb-1.5 block">确认密码 *</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入密码"
            required
          />
          {errors.confirmPassword && (
            <p className="text-sm text-ui-destructive mt-1">{errors.confirmPassword}</p>
          )}
        </div>

        <div>
          <Label htmlFor="name" className="mb-1.5 block">昵称（可选）</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入昵称"
          />
        </div>

        {errors.submit && (
          <p className="text-sm text-ui-destructive">{errors.submit}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? '保存中...' : '完成设置'}
        </Button>
      </form>
    </div>
  )
}