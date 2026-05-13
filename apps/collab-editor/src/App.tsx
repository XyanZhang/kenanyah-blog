import { BookOpen, PanelLeftClose, PanelLeftOpen, ServerCrash } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDocuments } from './hooks/useDocuments'
import { DocumentSidebar } from './components/DocumentSidebar'
import { CollaborativeEditor } from './components/CollaborativeEditor'
import { DocumentPasswordDialog } from './components/DocumentPasswordDialog'
import { NicknameSetupDialog } from './components/NicknameSetupDialog'
import { PresenceBar } from './components/PresenceBar'
import { useEditorUserProfile } from './hooks/useEditorUserProfile'
import { clearDocumentAccessToken, getStoredDocumentAccessToken, storeDocumentAccessToken } from './lib/document-access'
import { requestDocumentAccess } from './lib/documents-api'
import type { OnlineUser } from './hooks/useOnlineUsers'
import type { CollaborativeDocumentSummary, ConnectionStatus } from './types'

type PasswordDialogState = {
  mode: 'unlock' | 'set' | 'remove'
  document: CollaborativeDocumentSummary
} | null

export function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [accessTokens, setAccessTokens] = useState<Record<string, string | null>>({})
  const [passwordDialog, setPasswordDialog] = useState<PasswordDialogState>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isPasswordSaving, setIsPasswordSaving] = useState(false)
  const shareId = getShareIdFromLocation()
  const userProfile = useEditorUserProfile()
  const {
    documents,
    folders,
    activeDocument,
    activeDocumentId,
    isLoading,
    error,
    setActiveDocumentId,
    createDocument,
    renameDocument,
    moveDocument,
    createFolder,
    deleteFolder,
    renameFolder,
    updateDocumentAccess,
    reloadDocuments,
  } = useDocuments(shareId)

  const handleCreateDocument = async (folderPath = '') => {
    const title = window.prompt('新文档标题', '未命名协同文档')
    if (!title) return
    await createDocument(title, folderPath)
  }

  const handleCreateFolder = async (parentPath = '') => {
    const name = window.prompt('新文件夹名称', '新文件夹')
    if (!name) return
    const folderPath = [parentPath, name].filter(Boolean).join('/')
    await createFolder(folderPath)
  }

  const handleDeleteFolder = async (folderPath: string) => {
    const ok = window.confirm(`确认删除文件夹「${folderPath}」？只能删除空文件夹。`)
    if (!ok) return
    await deleteFolder(folderPath)
  }

  const handleRenameFolder = async (folderPath: string, currentName: string) => {
    const name = window.prompt('重命名文件夹', currentName)
    if (!name || name === currentName) return
    await renameFolder(folderPath, name)
  }

  const handleSelectDocument = (documentId: string) => {
    const document = documents.find((item) => item.id === documentId)
    if (!document) return
    if (document.isPasswordProtected && !getDocumentAccessToken(document.id)) {
      setPasswordDialog({ mode: 'unlock', document })
      return
    }
    setActiveDocumentId(document.id)
  }

  const handleToggleShare = async (document: CollaborativeDocumentSummary) => {
    const updated = await updateDocumentAccess(document.id, {
      isShareable: !document.isShareable,
      accessToken: getDocumentAccessToken(document.id),
    })
    if (updated.isShareable) await copyShareLink(updated)
  }

  const handleCopyShareLink = async (document: CollaborativeDocumentSummary) => {
    if (!document.isShareable) return
    await copyShareLink(document)
  }

  const handlePasswordSubmit = async (input: { password?: string; currentPassword?: string }) => {
    if (!passwordDialog) return
    setIsPasswordSaving(true)
    setPasswordError(null)
    try {
      if (passwordDialog.mode === 'unlock') {
        const access = await requestDocumentAccess(passwordDialog.document.id, input.password ?? '')
        storeAccessToken(passwordDialog.document.id, access.accessToken)
        setActiveDocumentId(passwordDialog.document.id)
      } else {
        const next = await updateDocumentAccess(passwordDialog.document.id, {
          password: passwordDialog.mode === 'remove' ? null : input.password,
          currentPassword: input.currentPassword,
          accessToken: getDocumentAccessToken(passwordDialog.document.id),
        })
        if (!next.isPasswordProtected) {
          clearStoredAccessToken(next.id)
        }
      }
      setPasswordDialog(null)
    } catch (caught) {
      setPasswordError(caught instanceof Error ? caught.message : '密码处理失败')
    } finally {
      setIsPasswordSaving(false)
    }
  }

  const storeAccessToken = (documentId: string, token: string) => {
    storeDocumentAccessToken(documentId, token)
    setAccessTokens((current) => ({ ...current, [documentId]: token }))
  }

  const clearStoredAccessToken = (documentId: string) => {
    clearDocumentAccessToken(documentId)
    setAccessTokens((current) => ({ ...current, [documentId]: null }))
  }

  const getDocumentAccessToken = (documentId: string) => {
    if (Object.prototype.hasOwnProperty.call(accessTokens, documentId)) {
      return accessTokens[documentId]
    }
    return getStoredDocumentAccessToken(documentId)
  }

  const copyShareLink = async (document: CollaborativeDocumentSummary) => {
    if (!document.shareId) return
    const url = `${window.location.origin}${window.location.pathname}?share=${document.shareId}`
    if (window.navigator.clipboard) {
      await window.navigator.clipboard.writeText(url)
      return
    }
    window.prompt('复制分享链接', url)
  }

  const activeDocumentAccessToken = activeDocument ? getDocumentAccessToken(activeDocument.id) : null

  useEffect(() => {
    setConnectionStatus(activeDocument ? 'connecting' : 'disconnected')
    setOnlineUsers([])
  }, [activeDocument?.id])

  useEffect(() => {
    if (shareId) return
    const documentId = new URLSearchParams(window.location.search).get('documentId')
    if (documentId) setActiveDocumentId(documentId)
  }, [setActiveDocumentId, shareId])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (shareId) return
    if (activeDocumentId) url.searchParams.set('documentId', activeDocumentId)
    else url.searchParams.delete('documentId')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }, [activeDocumentId, shareId])

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="app-topbar">
        <button
          className="topbar-collapse"
          type="button"
          onClick={() => setIsSidebarCollapsed((value) => !value)}
          title={isSidebarCollapsed ? '展开文档列表' : '折叠文档列表'}
          disabled={Boolean(shareId)}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <div className="topbar-title">
          <strong>{shareId ? '分享文档' : '协同文档'}</strong>
          <span>{activeDocument?.title ?? (shareId ? '正在加载分享文档' : '选择文档开始编辑')}</span>
        </div>
        <PresenceBar users={onlineUsers} status={activeDocument ? connectionStatus : 'disconnected'} />
      </header>

      <NicknameSetupDialog
        defaultNickname={userProfile.user.name}
        error={userProfile.error}
        isOpen={userProfile.status === 'needs-nickname'}
        onSave={userProfile.saveNickname}
      />

      <section className={`workspace-grid ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${shareId ? 'share-mode' : ''}`}>
        <div className="sidebar-slot" aria-hidden={isSidebarCollapsed || Boolean(shareId)}>
          <DocumentSidebar
            documents={documents}
            folders={folders}
            activeDocumentId={activeDocumentId}
            isLoading={isLoading}
            error={error}
            onSelectDocument={handleSelectDocument}
            onCopyShareLink={handleCopyShareLink}
            onToggleShare={handleToggleShare}
            onSetPassword={(document) => setPasswordDialog({ mode: 'set', document })}
            onRemovePassword={(document) => setPasswordDialog({ mode: 'remove', document })}
            onCreateDocument={handleCreateDocument}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onRenameFolder={handleRenameFolder}
            onMoveDocument={moveDocument}
            onReload={reloadDocuments}
          />
        </div>

        <div className="workspace">
          {activeDocument ? (
            activeDocument.isPasswordProtected && !activeDocumentAccessToken ? (
              <LockedWorkspace document={activeDocument} onUnlock={() => setPasswordDialog({ mode: 'unlock', document: activeDocument })} />
            ) : (
              <CollaborativeEditor
                key={`${activeDocument.id}:${activeDocumentAccessToken ?? 'public'}`}
                document={activeDocument}
                accessToken={activeDocumentAccessToken}
                user={userProfile.user}
                onRename={(title) => renameDocument(activeDocument.id, title)}
                onPresenceChange={(nextStatus, nextUsers) => {
                  setConnectionStatus(nextStatus)
                  setOnlineUsers(nextUsers)
                }}
              />
            )
          ) : (
            <EmptyWorkspace hasError={Boolean(error)} />
          )}
        </div>
      </section>
      <DocumentPasswordDialog
        document={passwordDialog?.document ?? null}
        mode={passwordDialog?.mode ?? null}
        error={passwordError}
        isSaving={isPasswordSaving}
        onClose={() => setPasswordDialog(null)}
        onSubmit={handlePasswordSubmit}
      />
    </main>
  )
}

function LockedWorkspace({
  document,
  onUnlock,
}: {
  document: CollaborativeDocumentSummary
  onUnlock: () => void
}) {
  return (
    <section className="empty-workspace">
      <BookOpen size={34} />
      <h2>「{document.title}」已加锁</h2>
      <p>输入文档密码后即可查看和协作编辑。</p>
      <button className="nickname-save-button inline-action" type="button" onClick={onUnlock}>
        输入密码
      </button>
    </section>
  )
}

function EmptyWorkspace({ hasError }: { hasError: boolean }) {
  const Icon = hasError ? ServerCrash : BookOpen
  return (
    <section className="empty-workspace">
      <Icon size={34} />
      <h2>{hasError ? '协同服务未连接' : '选择一篇文档开始编辑'}</h2>
      <p>
        {hasError
          ? '请确认协同服务和数据库已经启动。'
          : '同一篇文档可以在多个窗口同时打开，观察光标、块级编辑和自动保存。'}
      </p>
    </section>
  )
}

function getShareIdFromLocation() {
  const params = new URLSearchParams(window.location.search)
  return params.get('share')
}
