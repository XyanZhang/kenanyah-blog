import { ChevronRight, FileText, Folder, FolderOpen, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { CollaborativeDocumentFolder, CollaborativeDocumentSummary } from '../types'

type DocumentTreeProps = {
  documents: CollaborativeDocumentSummary[]
  folders: CollaborativeDocumentFolder[]
  activeDocumentId: string | null
  onSelectDocument: (documentId: string) => void
  onCreateDocument: (folderPath?: string) => void
  onCreateFolder: (parentPath?: string) => void
  onDeleteFolder: (folderPath: string) => void
  onRenameFolder: (folderPath: string, currentName: string) => void
  onMoveDocument: (documentId: string, folderPath: string) => void
}

type FolderTreeNode = {
  path: string
  name: string
  folders: FolderTreeNode[]
  documents: CollaborativeDocumentSummary[]
}

export function DocumentTree({
  documents,
  folders,
  activeDocumentId,
  onSelectDocument,
  onCreateDocument,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  onMoveDocument,
}: DocumentTreeProps) {
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set())
  const tree = useMemo(() => buildFolderTree(folders, documents), [documents, folders])

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((current) => {
      const next = new Set(current)
      if (next.has(folderPath)) next.delete(folderPath)
      else next.add(folderPath)
      return next
    })
  }

  return (
    <FolderNode
      node={tree}
      level={0}
      activeDocumentId={activeDocumentId}
      collapsedFolders={collapsedFolders}
      onToggleFolder={toggleFolder}
      onSelectDocument={onSelectDocument}
      onCreateDocument={onCreateDocument}
      onCreateFolder={onCreateFolder}
      onDeleteFolder={onDeleteFolder}
      onRenameFolder={onRenameFolder}
      onMoveDocument={onMoveDocument}
    />
  )
}

function FolderNode({
  node,
  level,
  activeDocumentId,
  collapsedFolders,
  onToggleFolder,
  onSelectDocument,
  onCreateDocument,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  onMoveDocument,
}: {
  node: FolderTreeNode
  level: number
  activeDocumentId: string | null
  collapsedFolders: Set<string>
  onToggleFolder: (folderPath: string) => void
  onSelectDocument: (documentId: string) => void
  onCreateDocument: (folderPath?: string) => void
  onCreateFolder: (parentPath?: string) => void
  onDeleteFolder: (folderPath: string) => void
  onRenameFolder: (folderPath: string, currentName: string) => void
  onMoveDocument: (documentId: string, folderPath: string) => void
}) {
  const isRoot = node.path === ''
  const isCollapsed = !isRoot && collapsedFolders.has(node.path)
  const canDelete = !isRoot && node.folders.length === 0 && node.documents.length === 0

  return (
    <div
      className={clsx('folder-node', isRoot && 'root')}
      style={{ '--tree-level': level } as CSSProperties}
      onDragOver={(event) => {
        if (isRoot) event.preventDefault()
      }}
      onDrop={(event) => {
        if (!isRoot) return
        const documentId = event.dataTransfer.getData('application/x-collab-document-id')
        if (documentId) onMoveDocument(documentId, '')
      }}
    >
      {!isRoot ? (
        <div
          className="folder-row"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.stopPropagation()
            const documentId = event.dataTransfer.getData('application/x-collab-document-id')
            if (documentId) onMoveDocument(documentId, node.path)
          }}
        >
          <button className="folder-main" type="button" onClick={() => onToggleFolder(node.path)}>
            <ChevronRight className={clsx('folder-chevron', !isCollapsed && 'open')} size={15} />
            {isCollapsed ? <Folder size={16} /> : <FolderOpen size={16} />}
            <span>{node.name}</span>
          </button>
          <div className="folder-actions">
            <button type="button" onClick={() => onCreateDocument(node.path)} title="在此文件夹中新建文档">
              <Plus size={14} />
            </button>
            <button type="button" onClick={() => onCreateFolder(node.path)} title="新建子文件夹">
              <FolderPlus size={14} />
            </button>
            <button type="button" onClick={() => onRenameFolder(node.path, node.name)} title="重命名文件夹">
              <Pencil size={14} />
            </button>
            <button
              type="button"
              disabled={!canDelete}
              onClick={() => onDeleteFolder(node.path)}
              title={canDelete ? '删除空文件夹' : '文件夹非空，不能删除'}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ) : null}

      {!isCollapsed ? (
        <div className="folder-children">
          {node.folders.map((folder) => (
            <FolderNode
              key={folder.path}
              node={folder}
              level={level + (isRoot ? 0 : 1)}
              activeDocumentId={activeDocumentId}
              collapsedFolders={collapsedFolders}
              onToggleFolder={onToggleFolder}
              onSelectDocument={onSelectDocument}
              onCreateDocument={onCreateDocument}
              onCreateFolder={onCreateFolder}
              onDeleteFolder={onDeleteFolder}
              onRenameFolder={onRenameFolder}
              onMoveDocument={onMoveDocument}
            />
          ))}
          {node.documents.map((document) => (
            <DocumentItem
              key={document.id}
              document={document}
              active={document.id === activeDocumentId}
              level={level + (isRoot ? 0 : 1)}
              onSelectDocument={onSelectDocument}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function DocumentItem({
  document,
  active,
  level,
  onSelectDocument,
}: {
  document: CollaborativeDocumentSummary
  active: boolean
  level: number
  onSelectDocument: (documentId: string) => void
}) {
  return (
    <button
      className={clsx('document-item', active && 'active')}
      type="button"
      draggable
      style={{ '--tree-level': level } as CSSProperties}
      onClick={() => onSelectDocument(document.id)}
      onDragStart={(event) => {
        event.dataTransfer.setData('application/x-collab-document-id', document.id)
        event.dataTransfer.effectAllowed = 'move'
      }}
    >
      <span className="document-icon">
        <FileText size={14} />
      </span>
      <strong>{document.title}</strong>
    </button>
  )
}

function buildFolderTree(
  folders: CollaborativeDocumentFolder[],
  documents: CollaborativeDocumentSummary[]
): FolderTreeNode {
  const root: FolderTreeNode = { path: '', name: '全部文档', folders: [], documents: [] }
  const nodeMap = new Map<string, FolderTreeNode>([['', root]])

  const sortedFolders = [...folders].sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'))
  for (const folder of sortedFolders) {
    const node = getOrCreateNode(nodeMap, folder.path, folder.name)
    const parent = getOrCreateNode(
      nodeMap,
      folder.parentPath,
      folder.parentPath.split('/').at(-1) ?? '全部文档'
    )
    if (!parent.folders.some((item) => item.path === node.path)) parent.folders.push(node)
  }

  for (const document of documents) {
    const parent = getOrCreateNode(
      nodeMap,
      document.folderPath,
      document.folderPath.split('/').at(-1) ?? '全部文档'
    )
    parent.documents.push(document)
  }

  sortTree(root)
  return root
}

function getOrCreateNode(nodeMap: Map<string, FolderTreeNode>, path: string, name: string) {
  const current = nodeMap.get(path)
  if (current) return current
  const node: FolderTreeNode = { path, name, folders: [], documents: [] }
  nodeMap.set(path, node)
  return node
}

function sortTree(node: FolderTreeNode) {
  node.folders.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  node.documents.sort((a, b) => {
    const left = new Date(a.lastEditedAt ?? a.updatedAt).getTime()
    const right = new Date(b.lastEditedAt ?? b.updatedAt).getTime()
    return right - left
  })
  node.folders.forEach(sortTree)
}
