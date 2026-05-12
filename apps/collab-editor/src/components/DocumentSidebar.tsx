import { FileText, Plus, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import type { CollaborativeDocumentSummary } from '../types'

type DocumentSidebarProps = {
  documents: CollaborativeDocumentSummary[]
  activeDocumentId: string | null
  isLoading: boolean
  error: string | null
  onSelectDocument: (documentId: string) => void
  onCreateDocument: () => void
  onReload: () => void
}

export function DocumentSidebar({
  documents,
  activeDocumentId,
  isLoading,
  error,
  onSelectDocument,
  onCreateDocument,
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

      <button className="new-document-button" type="button" onClick={onCreateDocument}>
        <Plus size={17} />
        新建文档
      </button>

      <div className="document-list" aria-live="polite">
        {isLoading ? <p className="sidebar-message">正在整理文档...</p> : null}
        {error ? <p className="sidebar-message error">{error}</p> : null}
        {!isLoading && !error && documents.length === 0 ? (
          <p className="sidebar-message">还没有协同文档。</p>
        ) : null}

        {documents.map((document) => (
          <button
            className={clsx('document-item', document.id === activeDocumentId && 'active')}
            key={document.id}
            type="button"
            onClick={() => onSelectDocument(document.id)}
          >
            <span className="document-icon">
              <FileText size={16} />
            </span>
            <span>
              <strong>{document.title}</strong>
              <small>
                {document.summary ?? '多人实时编辑'} · {formatUpdatedAt(document.lastEditedAt ?? document.updatedAt)}
              </small>
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
