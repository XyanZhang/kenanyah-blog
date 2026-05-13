import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'

import { BlockNoteView } from '@blocknote/mantine'
import {
  FormattingToolbarController,
  SideMenu,
  SideMenuController,
  type SideMenuProps,
  useCreateBlockNote,
} from '@blocknote/react'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { Pin, PinOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import * as Y from 'yjs'
import { AiFormattingToolbar, AiSlashMenu } from './AiFormattingToolbar'
import { BlockFormatMenu } from './BlockFormatMenu'
import { handleCodeAwarePaste } from '../lib/code-paste'
import { collabWsUrl } from '../lib/env'
import { uploadEditorFile } from '../lib/file-upload'
import { useOnlineUsers } from '../hooks/useOnlineUsers'
import type { LocalPresenceUser } from '../lib/user-presence'
import type { ConnectionStatus, CollaborativeDocumentSummary } from '../types'

type OutlineItem = {
  id: string
  text: string
  level: number
}

type CollaborativeEditorProps = {
  document: CollaborativeDocumentSummary
  accessToken?: string | null
  onRename: (title: string) => Promise<void>
  onPresenceChange?: (status: ConnectionStatus, users: ReturnType<typeof useOnlineUsers>) => void
  user: LocalPresenceUser
}

export function CollaborativeEditor({ document, accessToken, onRename, onPresenceChange, user }: CollaborativeEditorProps) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [outlineItems, setOutlineItems] = useState<OutlineItem[]>([])
  const [isOutlinePinned, setIsOutlinePinned] = useState(true)

  const collaboration = useMemo(() => {
    const ydoc = new Y.Doc()
    const provider = new HocuspocusProvider({
      url: collabWsUrl,
      name: `doc:${document.id}`,
      document: ydoc,
      token: JSON.stringify({ pixelId: user.pixelId, accessToken: accessToken ?? null }),
    })
    if (!provider.awareness) {
      throw new Error('Hocuspocus provider did not initialize awareness.')
    }

    provider.awareness.setLocalStateField('user', user)

    return { ydoc, provider, awareness: provider.awareness }
  }, [accessToken, document.id, user])

  useEffect(() => {
    const { provider } = collaboration
    const handleConnect = () => setStatus('connected')
    const handleDisconnect = () => setStatus('disconnected')
    const handleOpen = () => setStatus('connected')
    const handleClose = () => setStatus('disconnected')
    const handleSynced = () => setStatus('connected')

    provider.on('open', handleOpen)
    provider.on('close', handleClose)
    provider.on('connect', handleConnect)
    provider.on('disconnect', handleDisconnect)
    provider.on('synced', handleSynced)

    return () => {
      provider.off('open', handleOpen)
      provider.off('close', handleClose)
      provider.off('connect', handleConnect)
      provider.off('disconnect', handleDisconnect)
      provider.off('synced', handleSynced)
      provider.destroy()
      collaboration.ydoc.destroy()
    }
  }, [collaboration])

  const users = useOnlineUsers(collaboration.provider)

  useEffect(() => {
    onPresenceChange?.(status, users)
  }, [onPresenceChange, status, users])
  const editor = useCreateBlockNote(
    {
      collaboration: {
        provider: { awareness: collaboration.awareness },
        fragment: collaboration.ydoc.getXmlFragment('document-store'),
        user,
        showCursorLabels: 'activity',
      },
      pasteHandler: handleCodeAwarePaste,
      uploadFile: uploadEditorFile,
    },
    [collaboration, user]
  )

  useEffect(() => {
    const syncOutline = () => {
      setOutlineItems(extractOutlineItems(editor.document))
    }

    syncOutline()
    editor.onEditorContentChange(syncOutline)
  }, [editor])

  return (
    <section className="editor-shell">
      <div className="editor-body">
        <DocumentOutline
          items={outlineItems}
          isPinned={isOutlinePinned}
          onTogglePinned={() => setIsOutlinePinned((value) => !value)}
        />
        <div className="editor-surface">
          <BlockNoteView editor={editor} formattingToolbar={false} theme="light">
            <FormattingToolbarController formattingToolbar={AiFormattingToolbar} />
            <SideMenuController sideMenu={(props) => <DefaultSideMenuWithFormatMenu {...props} />} />
            <AiSlashMenu />
          </BlockNoteView>
        </div>
      </div>
    </section>
  )
}

function DefaultSideMenuWithFormatMenu({ dragHandleMenu }: SideMenuProps) {
  return <SideMenu dragHandleMenu={dragHandleMenu ?? BlockFormatMenu} />
}

function DocumentOutline({
  items,
  isPinned,
  onTogglePinned,
}: {
  items: OutlineItem[]
  isPinned: boolean
  onTogglePinned: () => void
}) {
  const isCollapsed = !isPinned

  return (
    <aside
      className={`document-outline ${isCollapsed ? 'collapsed' : ''} ${isPinned ? 'pinned' : ''}`}
      aria-label="文档目录"
    >
      <div className="outline-header">
        <div>
          <p className="eyebrow">Outline</p>
          <h3>目录</h3>
        </div>
        <div className="outline-actions">
          <button
            className="outline-icon-button"
            type="button"
            onClick={onTogglePinned}
            title={isPinned ? '收起目录' : '固定并展开目录'}
          >
            {isPinned ? <Pin size={14} /> : <PinOff size={14} />}
          </button>
        </div>
      </div>

      {isCollapsed ? null : (
        <>
          {items.length === 0 ? (
            <p className="outline-empty">添加标题块后会生成目录。</p>
          ) : (
            <nav>
              {items.map((item) => (
                <button
                  className="outline-item"
                  data-level={item.level}
                  key={item.id}
                  type="button"
                  onClick={() => scrollToBlock(item.id)}
                  title={item.text}
                >
                  {item.text}
                </button>
              ))}
            </nav>
          )}
        </>
      )}
    </aside>
  )
}

function extractOutlineItems(blocks: Array<Record<string, any>>): OutlineItem[] {
  return blocks.flatMap((block) => {
    const ownItem = block.type === 'heading' ? [blockToOutlineItem(block)] : []
    const childItems = Array.isArray(block.children) ? extractOutlineItems(block.children) : []
    return [...ownItem, ...childItems].filter((item): item is OutlineItem => Boolean(item))
  })
}

function blockToOutlineItem(block: Record<string, any>): OutlineItem | null {
  const text = inlineContentToText(block.content)
  if (!text) return null

  const level = Number(block.props?.level ?? 1)
  return {
    id: String(block.id),
    text,
    level: Number.isFinite(level) ? Math.max(1, Math.min(level, 3)) : 1,
  }
}

function inlineContentToText(content: unknown): string {
  if (!Array.isArray(content)) return ''

  return content
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'text' in item) {
        return String((item as { text?: unknown }).text ?? '')
      }
      return ''
    })
    .join('')
    .trim()
}

function scrollToBlock(blockId: string) {
  const blockElement = document.querySelector(`[data-id="${CSS.escape(blockId)}"]`)
  blockElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
