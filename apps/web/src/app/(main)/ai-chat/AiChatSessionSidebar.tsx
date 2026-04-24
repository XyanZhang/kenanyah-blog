'use client'

import { Bot, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import type { ChatConversation } from '@/lib/ai-chat-api'

function getConversationDisplayTitle(title?: string | null): string {
  const normalizedTitle = title?.trim()
  return normalizedTitle ? normalizedTitle : '未命名'
}

interface AiChatSessionSidebarProps {
  conversations: ChatConversation[]
  currentId: string | null
  loadingConversations: boolean
  cannotStartConversation: boolean
  editingId: string | null
  editingTitle: string
  panelClass: string
  onCreateConversation: () => void
  onSelectConversation: (conversationId: string) => void
  onDeleteConversation: (conversationId: string) => void
  onStartEdit: (conversationId: string, title: string) => void
  onChangeEditingTitle: (title: string) => void
  onCommitEdit: (conversationId: string, originalTitle: string | null) => Promise<void>
  onCancelEdit: (originalTitle: string | null) => void
}

export function AiChatSessionSidebar({
  conversations,
  currentId,
  loadingConversations,
  cannotStartConversation,
  editingId,
  editingTitle,
  panelClass,
  onCreateConversation,
  onSelectConversation,
  onDeleteConversation,
  onStartEdit,
  onChangeEditingTitle,
  onCommitEdit,
  onCancelEdit,
}: AiChatSessionSidebarProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className={`${panelClass} mb-4 shrink-0 p-3.5`}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-primary/12 text-accent-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-content-primary">AI 工作台</h1>
            <p className="mt-1 text-xs leading-5 text-content-secondary">切换会话、进入当前上下文。</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={onCreateConversation}
            disabled={cannotStartConversation}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-primary px-3 py-2.5 text-sm font-medium text-white shadow-md transition-colors hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            新建会话
          </button>
        </div>
      </div>

      <div className={`${panelClass} flex min-h-0 flex-1 flex-col overflow-hidden p-2`}>
        <div className="border-b border-line-glass/60 px-2 pb-3 pt-1">
          <div className="text-[11px] uppercase tracking-[0.28em] text-content-muted">Sessions</div>
          <div className="mt-2 text-sm text-content-secondary">当前共 {conversations.length} 个会话</div>
        </div>

        {loadingConversations ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-4 text-sm text-content-secondary">
            {cannotStartConversation ? '登录后可以创建和管理你的会话。' : '暂无会话，先发一条消息试试吧。'}
          </p>
        ) : (
          <ul
            className="hide-scrollbar mt-2 h-full min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {conversations.map((conv) => (
              <li key={conv.id}>
                {editingId === conv.id ? (
                  <div className="rounded-2xl border border-line-glass/70 bg-white/62 px-3 py-2">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => onChangeEditingTitle(e.target.value.slice(0, 100))}
                      onBlur={() => {
                        void onCommitEdit(conv.id, conv.title)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur()
                        } else if (e.key === 'Escape') {
                          onCancelEdit(conv.title)
                          e.currentTarget.blur()
                        }
                      }}
                      className="w-full rounded-lg border border-line-glass bg-surface-glass px-2 py-1.5 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                      placeholder="会话标题"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectConversation(conv.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelectConversation(conv.id)
                      }
                    }}
                    className={`flex w-full items-start gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm transition-all cursor-pointer ${
                      conv.id === currentId
                        ? 'border-accent-primary/18 bg-accent-primary/8 text-content-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]'
                        : 'border-transparent bg-transparent text-content-secondary hover:border-line-glass/70 hover:bg-white/55 hover:text-content-primary'
                    }`}
                  >
                    <div
                      className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        conv.id === currentId ? 'bg-accent-primary' : 'bg-line-glass'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{getConversationDisplayTitle(conv.title)}</div>
                      <div className="mt-1 text-[11px] text-content-tertiary">共 {conv.messageCount} 条消息</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onStartEdit(conv.id, conv.title ?? '')
                      }}
                      className="shrink-0 rounded-xl p-1.5 text-content-tertiary transition-colors hover:bg-white/70 hover:text-content-primary"
                      aria-label="编辑会话标题"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteConversation(conv.id)
                      }}
                      className="shrink-0 rounded-xl p-1.5 text-content-tertiary transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label="删除会话"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
