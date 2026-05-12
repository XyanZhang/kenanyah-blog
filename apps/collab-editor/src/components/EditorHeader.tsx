import { Check, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PresenceBar } from './PresenceBar'
import type { ConnectionStatus, CollaborativeDocumentSummary } from '../types'
import type { OnlineUser } from '../hooks/useOnlineUsers'

type EditorHeaderProps = {
  document: CollaborativeDocumentSummary
  users: OnlineUser[]
  status: ConnectionStatus
  onRename: (title: string) => Promise<void>
}

export function EditorHeader({ document, users, status, onRename }: EditorHeaderProps) {
  const [title, setTitle] = useState(document.title)
  const [isRenaming, setIsRenaming] = useState(false)

  useEffect(() => {
    setTitle(document.title)
  }, [document.id, document.title])

  const commitTitle = async () => {
    const nextTitle = title.trim()
    if (!nextTitle || nextTitle === document.title) {
      setTitle(document.title)
      setIsRenaming(false)
      return
    }

    await onRename(nextTitle)
    setIsRenaming(false)
  }

  return (
    <header className="editor-header">
      <div className="title-cluster">
        <p className="eyebrow">Block Document</p>
        <div className="title-row">
          {isRenaming ? (
            <input
              className="title-input"
              value={title}
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => void commitTitle()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void commitTitle()
                if (event.key === 'Escape') {
                  setTitle(document.title)
                  setIsRenaming(false)
                }
              }}
            />
          ) : (
            <h2>{document.title}</h2>
          )}
          <button
            className="icon-button"
            type="button"
            onClick={() => (isRenaming ? void commitTitle() : setIsRenaming(true))}
            title={isRenaming ? '保存标题' : '重命名文档'}
          >
            {isRenaming ? <Check size={17} /> : <Pencil size={16} />}
          </button>
        </div>
      </div>

      <PresenceBar users={users} status={status} />
    </header>
  )
}
