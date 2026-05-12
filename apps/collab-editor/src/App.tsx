import { BookOpen, PanelLeftClose, PanelLeftOpen, ServerCrash } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDocuments } from './hooks/useDocuments'
import { DocumentSidebar } from './components/DocumentSidebar'
import { CollaborativeEditor } from './components/CollaborativeEditor'
import { PresenceBar } from './components/PresenceBar'
import type { OnlineUser } from './hooks/useOnlineUsers'
import type { ConnectionStatus } from './types'

export function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
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
    reloadDocuments,
  } = useDocuments()

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

  useEffect(() => {
    setConnectionStatus(activeDocument ? 'connecting' : 'disconnected')
    setOnlineUsers([])
  }, [activeDocument?.id])

  useEffect(() => {
    const documentId = new URLSearchParams(window.location.search).get('documentId')
    if (documentId) setActiveDocumentId(documentId)
  }, [setActiveDocumentId])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (activeDocumentId) url.searchParams.set('documentId', activeDocumentId)
    else url.searchParams.delete('documentId')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }, [activeDocumentId])

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
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <div className="topbar-title">
          <strong>协同文档</strong>
          <span>{activeDocument?.title ?? '选择文档开始编辑'}</span>
        </div>
        <PresenceBar users={onlineUsers} status={activeDocument ? connectionStatus : 'disconnected'} />
      </header>

      <section className={`workspace-grid ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {isSidebarCollapsed ? null : (
          <DocumentSidebar
            documents={documents}
            folders={folders}
            activeDocumentId={activeDocumentId}
            isLoading={isLoading}
            error={error}
            onSelectDocument={setActiveDocumentId}
            onCreateDocument={handleCreateDocument}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onRenameFolder={handleRenameFolder}
            onMoveDocument={moveDocument}
            onReload={reloadDocuments}
          />
        )}

        <div className="workspace">
          {activeDocument ? (
            <CollaborativeEditor
              key={activeDocument.id}
              document={activeDocument}
              onRename={(title) => renameDocument(activeDocument.id, title)}
              onPresenceChange={(nextStatus, nextUsers) => {
                setConnectionStatus(nextStatus)
                setOnlineUsers(nextUsers)
              }}
            />
          ) : (
            <EmptyWorkspace hasError={Boolean(error)} />
          )}
        </div>
      </section>
    </main>
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
