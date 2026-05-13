import { UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

type NicknameSetupDialogProps = {
  defaultNickname: string
  error?: string | null
  isOpen: boolean
  onSave: (nickname: string) => Promise<void>
}

export function NicknameSetupDialog({
  defaultNickname,
  error,
  isOpen,
  onSave,
}: NicknameSetupDialogProps) {
  const [nickname, setNickname] = useState(defaultNickname)
  const [isSaving, setIsSaving] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) setNickname(defaultNickname)
  }, [defaultNickname, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextNickname = nickname.trim()
    if (!nextNickname) {
      setLocalError('先给自己取一个昵称吧')
      return
    }

    setIsSaving(true)
    setLocalError(null)
    try {
      await onSave(nextNickname)
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : '昵称保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="nickname-overlay" role="presentation">
      <form className="nickname-dialog" onSubmit={handleSubmit}>
        <div className="nickname-icon">
          <UserRound size={22} />
        </div>
        <div className="nickname-copy">
          <p className="eyebrow">First visit</p>
          <h2>设置你的协作昵称</h2>
          <p>这个昵称会按当前浏览器的像素 id 保存，下次进入文档时自动带回来。</p>
        </div>

        <label className="nickname-field">
          <span>昵称</span>
          <input
            autoFocus
            maxLength={24}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="例如：青禾"
          />
        </label>

        {localError || error ? <p className="nickname-error">{localError ?? error}</p> : null}

        <button className="nickname-save-button" type="submit" disabled={isSaving}>
          {isSaving ? '保存中...' : '保存并进入'}
        </button>
      </form>
    </div>
  )
}
