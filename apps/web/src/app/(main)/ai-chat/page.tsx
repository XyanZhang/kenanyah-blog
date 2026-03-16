'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Loader2, MessageCircle, Send, Bot } from 'lucide-react'
import {
  listConversations,
  createConversation,
  getConversation,
  streamChatMessage,
  type ChatConversation,
  type ChatMessage,
} from '@/lib/ai-chat-api'

type UiMessage = ChatMessage & {
  pending?: boolean
}

export default function AiChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialConversationId = searchParams.get('conversationId')

  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [input, setInput] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingConversations(true)
    listConversations()
      .then(async (list) => {
        if (cancelled) return
        setConversations(list)
        let targetId = initialConversationId
        if (!targetId) {
          targetId = list[0]?.id ?? null
        }
        if (!targetId) {
          const conv = await createConversation()
          if (cancelled) return
          setConversations((prev) => [conv, ...prev])
          setCurrentId(conv.id)
        } else {
          setCurrentId(targetId)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoadingConversations(false)
      })
    return () => {
      cancelled = true
    }
  }, [initialConversationId])

  useEffect(() => {
    if (!currentId) return
    let cancelled = false
    setLoadingMessages(true)
    setError(null)
    getConversation(currentId)
      .then((detail) => {
        if (cancelled) return
        setMessages(detail.messages as UiMessage[])
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setMessages([])
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false)
      })
    return () => {
      cancelled = true
    }
  }, [currentId])

  useEffect(() => {
    if (!bottomRef.current) return
    bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, sending])

  async function handleSend() {
    if (!currentId || !input.trim() || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)
    setError(null)

    const userMsg: UiMessage = {
      id: `local-user-${Date.now()}`,
      conversationId: currentId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      pending: true,
    }
    const assistantMsg: UiMessage = {
      id: `local-assistant-${Date.now()}`,
      conversationId: currentId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      pending: true,
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])

    try {
      await streamChatMessage(
        currentId,
        content,
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: (m.content ?? '') + chunk }
                : m
            )
          )
        },
        (err) => {
          setError(err)
        }
      )
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMsg.id || m.id === assistantMsg.id ? { ...m, pending: false } : m
        )
      )
      listConversations()
        .then((list) => setConversations(list))
        .catch(() => undefined)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id && m.id !== assistantMsg.id))
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <main className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8 flex flex-col md:flex-row gap-4 bg-gradient-to-b from-surface-glass/40 via-surface-glass/10 to-surface-glass/40">
      <section className="w-full md:w-72 shrink-0 md:h-[calc(100vh-140px)] md:max-h-[calc(100vh-140px)] flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-content-primary flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent-primary" />
            AI 对话
          </h1>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-line-primary bg-surface-glass px-2 py-1 text-xs font-medium text-content-primary hover:border-accent-primary/60 hover:bg-accent-primary/10"
            onClick={async () => {
              try {
                const conv = await createConversation()
                setConversations((prev) => [conv, ...prev])
                setCurrentId(conv.id)
                router.push('/ai-chat')
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err))
              }
            }}
          >
            <MessageCircle className="h-3 w-3" />
            新建会话
          </button>
        </div>
        <div className="rounded-2xl border border-line-glass bg-surface-glass/80 backdrop-blur-sm p-2 flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-content-secondary px-2 py-4">暂无会话，先发一条消息试试吧。</p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    type="button"
                    onClick={() => setCurrentId(conv.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                      conv.id === currentId
                        ? 'bg-accent-primary/10 text-accent-primary'
                        : 'bg-transparent text-content-secondary hover:bg-surface-tertiary'
                    }`}
                  >
                    <div className="truncate">
                      {conv.title || '未命名会话'}
                    </div>
                    <div className="mt-1 text-[11px] text-content-tertiary">
                      共 {conv.messageCount} 条消息
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="flex-1 flex flex-col md:h-[calc(100vh-140px)] md:max-h-[calc(100vh-140px)] min-h-[60vh]">
        <div className="flex-1 rounded-3xl border border-line-glass bg-surface-glass/90 backdrop-blur-lg p-4 md:p-5 flex flex-col shadow-lg shadow-black/10 overflow-hidden">
          {error && (
            <p className="mb-3 text-sm text-red-500" role="alert">
              {error}
            </p>
          )}
          {loadingMessages && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
            </div>
          )}
          {!loadingMessages && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 scrollbar-none">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-content-secondary">
                  还没有消息，试着问问 AI 一个问题吧～
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`relative max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-accent-primary text-white'
                          : 'bg-surface-tertiary/90 text-content-primary'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="md-content max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              table: ({ children, ...props }) => (
                                <div className="md-table-wrapper">
                                  <table {...props}>{children}</table>
                                </div>
                              ),
                            }}
                          >
                            {msg.content || (msg.pending ? '思考中…' : '')}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="mt-3 md:mt-4 rounded-3xl border border-line-glass bg-surface-glass/95 backdrop-blur-xl p-2 md:p-3 shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
          <div className="flex items-end gap-2 md:gap-3">
            <textarea
              className="flex-1 resize-none rounded-2xl border border-line-glass bg-surface-tertiary/40 px-3 py-2.5 text-sm text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              rows={3}
              placeholder="输入你的问题，按 Enter 发送，Shift+Enter 换行…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending || !currentId}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !input.trim() || !currentId}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-primary text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-primary/90 transition-colors"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

