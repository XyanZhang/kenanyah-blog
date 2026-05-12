import { FolderPlus, Plus, RefreshCw } from 'lucide-react'
import { DocumentTree } from './DocumentTree'
import type { CollaborativeDocumentFolder, CollaborativeDocumentSummary } from '../types'

type DocumentSidebarProps = {
  documents: CollaborativeDocumentSummary[]
  folders: CollaborativeDocumentFolder[]
  activeDocumentId: string | null
  isLoading: boolean
  error: string | null
  onSelectDocument: (documentId: string) => void
  onCreateDocument: (folderPath?: string) => void
  onCreateFolder: (parentPath?: string) => void
  onDeleteFolder: (folderPath: string) => void
  onRenameFolder: (folderPath: string, currentName: string) => void
  onMoveDocument: (documentId: string, folderPath: string) => void
  onReload: () => void
}

export function DocumentSidebar({
  documents,
  folders,
  activeDocumentId,
  isLoading,
  error,
  onSelectDocument,
  onCreateDocument,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  onMoveDocument,
  onReload,
}: DocumentSidebarProps) {
  return (
    <aside className="document-sidebar">
      <div className="sidebar-top">
        <div>
          <p className="eyebrow">Docs</p>
          <h2>文档</h2>
        </div>
        <button className="icon-button" type="button" onClick={onReload} title="刷新文档列表">
          <RefreshCw size={17} />
        </button>
      </div>

      <div className="sidebar-actions">
        <button className="new-document-button" type="button" onClick={() => onCreateDocument('')}>
          <Plus size={17} />
          新建文档
        </button>
        <button className="new-folder-button" type="button" onClick={() => onCreateFolder('')}>
          <FolderPlus size={16} />
          新建文件夹
        </button>
      </div>

      <div className="document-list" aria-live="polite">
        {isLoading ? <p className="sidebar-message">正在整理文档...</p> : null}
        {error ? <p className="sidebar-message error">{error}</p> : null}
        {!isLoading && !error && documents.length === 0 ? (
          <p className="sidebar-message">还没有协同文档。</p>
        ) : null}

        {!isLoading && !error ? (
          <DocumentTree
            documents={documents}
            folders={folders}
            activeDocumentId={activeDocumentId}
            onSelectDocument={onSelectDocument}
            onCreateDocument={onCreateDocument}
            onCreateFolder={onCreateFolder}
            onDeleteFolder={onDeleteFolder}
            onRenameFolder={onRenameFolder}
            onMoveDocument={onMoveDocument}
          />
        ) : null}
      </div>
    </aside>
  )
}
