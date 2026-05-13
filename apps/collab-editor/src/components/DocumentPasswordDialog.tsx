import { LockKeyhole, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { CollaborativeDocumentSummary } from '../types'

type PasswordDialogMode = 'unlock' | 'set' | 'remove'

type DocumentPasswordDialogProps = {
  document: CollaborativeDocumentSummary | null
  mode: PasswordDialogMode | null
  isSaving?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (input: { password?: string; currentPassword?: string }) => Promise<void>
}

export function DocumentPasswordDialog({
  document,
  mode,
  isSaving = false,
  error,
  onClose,
  onSubmit,
}: DocumentPasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!mode) return
    setPassword('')
    setCurrentPassword('')
    setLocalError(null)
  }, [mode, document?.id])

  if (!mode || !document) return null

  const copy = getDialogCopy(mode, document)
  const needsNewPassword = mode !== 'remove'
  const needsCurrentPassword = mode !== 'unlock' && document.isPasswordProtected

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (needsNewPassword && password.trim().length < 4) {
      setLocalError('密码至少 4 位')
      return
    }
    if (needsCurrentPassword && !currentPassword.trim()) {
      setLocalError('请输入当前密码')
      return
    }

    setLocalError(null)
    await onSubmit({
      password: needsNewPassword ? password : undefined,
      currentPassword: needsCurrentPassword ? currentPassword : undefined,
    })
  }

  return (
    <div className="modal-overlay" role="presentation">
      <form className="access-dialog" onSubmit={handleSubmit}>
        <div className="nickname-icon">
          {mode === 'unlock' ? <LockKeyhole size={22} /> : <Share2 size={22} />}
        </div>
        <div className="nickname-copy">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>
        </div>

        {needsCurrentPassword ? (
          <label className="nickname-field">
            <span>当前密码</span>
            <input
              autoFocus
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>
        ) : null}

        {needsNewPassword ? (
          <label className="nickname-field">
            <span>{mode === 'unlock' ? '文档密码' : '新密码'}</span>
            <input
              autoFocus={!needsCurrentPassword}
              type="password"
              minLength={4}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        ) : null}

        {localError || error ? <p className="nickname-error">{localError ?? error}</p> : null}

        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={isSaving}>
            取消
          </button>
          <button className="nickname-save-button" type="submit" disabled={isSaving}>
            {isSaving ? '处理中...' : copy.submit}
          </button>
        </div>
      </form>
    </div>
  )
}

function getDialogCopy(mode: PasswordDialogMode, document: CollaborativeDocumentSummary) {
  if (mode === 'unlock') {
    return {
      eyebrow: 'Protected',
      title: `访问「${document.title}」`,
      description: '这篇文档已开启密码保护，输入密码后会在当前浏览器记住访问状态。',
      submit: '解锁文档',
    }
  }

  if (mode === 'remove') {
    return {
      eyebrow: 'Password',
      title: `移除「${document.title}」的密码`,
      description: '移除后，只要文档仍开启分享，拿到分享链接的人就可以直接打开。',
      submit: '移除密码',
    }
  }

  return {
    eyebrow: 'Password',
    title: document.isPasswordProtected ? `修改「${document.title}」的密码` : `设置「${document.title}」的密码`,
    description: '密码只用于这个文档的访问链接，修改后旧浏览器授权会自动失效。',
    submit: document.isPasswordProtected ? '更新密码' : '设置密码',
  }
}
