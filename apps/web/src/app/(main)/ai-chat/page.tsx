'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Loader2,
  Send,
  Bot,
  Pencil,
  Trash2,
  Database,
  Plus,
  Keyboard,
  Mic,
  PanelLeft,
  X,
} from 'lucide-react'
import {
  listConversations,
  cancelBlogWorkflow,
  createConversation,
  deleteConversation,
  getConversation,
  streamChatMessage,
  streamBlogWorkflow,
  toChatProgressState,
  updateConversation,
  type BlogWorkflowResult,
  type ChatProgressState,
  type ChatConversation,
  type ChatMessage,
} from '@/lib/ai-chat-api'
import { AgentStatusCard } from '@/components/chat/AgentStatusCard'
import {
  buildWorkflowFollowupOperationCardMessage,
  isWorkflowOperationCardContent,
  parseOperationCardContent,
  type FollowupOperationCard,
  type OperationCardAction,
} from '@/lib/operation-cards'
import { VoiceRecorder } from '@/components/voice-recorder'

type UiMessage = ChatMessage & {
  pending?: boolean
  queued?: boolean
  interrupted?: boolean
  progress?: ChatProgressState | null
}

type ChatQueueItem = {
  id: string
  conversationId: string
  content: string
  useKnowledgeBase: boolean
  userMsgId: string
  assistantMsgId: string
}

type WorkflowQueueItem = {
  id: string
  conversationId: string
  content: string
  publishDirectly: boolean
  userMsgId: string
  assistantMsgId: string
}

type ChatInputMode = 'text' | 'voice'
type FollowupField = 'topic' | 'audience' | 'tone' | 'goals' | 'general'

type FollowupQuestionSpec = {
  id: string
  question: string
  field: FollowupField
  title: string
  options: string[]
  multiple: boolean
  placeholder: string
}

type FollowupAnswerDraft = {
  selectedOptions: string[]
  customText: string
}

function isWorkflowFollowupMessage(content: string): boolean {
  return isWorkflowOperationCardContent(content)
}

function buildFollowupQuestionSpec(question: string, index: number): FollowupQuestionSpec {
  if (/(读者|受众|面向|给谁看)/.test(question)) {
    return {
      id: `audience-${index}`,
      question,
      field: 'audience',
      title: '目标读者',
      options: ['前端工程师', '后端工程师', '全栈开发者', '产品/设计同学'],
      multiple: false,
      placeholder: '例如：有 React 基础的前端开发者',
    }
  }

  if (/(语气|风格|调性|文风)/.test(question)) {
    return {
      id: `tone-${index}`,
      question,
      field: 'tone',
      title: '文章语气',
      options: ['专业严谨', '通俗易懂', '偏实战', '简洁克制'],
      multiple: true,
      placeholder: '例如：专业但不要太学术，适合博客阅读',
    }
  }

  if (/(目标|重点|收获|想达到|解决什么|希望读者)/.test(question)) {
    return {
      id: `goals-${index}`,
      question,
      field: 'goals',
      title: '写作重点',
      options: ['快速入门', '解释原理', '提供示例代码', '总结最佳实践', '补充避坑建议'],
      multiple: true,
      placeholder: '例如：突出关键步骤、注意事项和代码示例',
    }
  }

  if (/(主题|聚焦|写什么|内容方向|标题)/.test(question)) {
    return {
      id: `topic-${index}`,
      question,
      field: 'topic',
      title: '文章主题',
      options: ['沿用当前对话主题', '聚焦实战教程', '聚焦方案设计', '聚焦问题排查'],
      multiple: false,
      placeholder: '例如：围绕 AI 聊天页的博客工作流交互优化',
    }
  }

  return {
    id: `general-${index}`,
    question,
    field: 'general',
    title: `补充要求 ${index + 1}`,
    options: ['按合理默认值', '结合当前上下文', '偏简洁', '偏详细'],
    multiple: true,
    placeholder: '例如：结构分成背景、方案、实现与总结四部分',
  }
}

function getEmptyFollowupAnswerDraft(): FollowupAnswerDraft {
  return {
    selectedOptions: [],
    customText: '',
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

function getOperationActionButtonClass(style?: OperationCardAction['style']): string {
  if (style === 'danger') {
    return 'border-ui-destructive/25 bg-ui-destructive-light text-ui-destructive hover:bg-ui-destructive/12'
  }

  if (style === 'primary') {
    return 'border-accent-primary/30 bg-accent-primary text-white hover:bg-accent-primary/90'
  }

  if (style === 'ghost') {
    return 'border-line-glass bg-surface-glass/70 text-content-secondary hover:border-accent-primary/20 hover:text-content-primary'
  }

  return 'border-accent-primary/25 bg-accent-primary/8 text-accent-primary hover:bg-accent-primary/12'
}

function getConversationDisplayTitle(title?: string | null): string {
  const normalizedTitle = title?.trim()
  return normalizedTitle ? normalizedTitle : '未命名'
}

export default function AiChatPage() {
  const searchParams = useSearchParams()
  const initialConversationId = searchParams.get('conversationId')

  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [input, setInput] = useState('')
  const [inputMode, setInputMode] = useState<ChatInputMode>('text')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [runningWorkflow, setRunningWorkflow] = useState(false)
  const [workflowFollowupMode, setWorkflowFollowupMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(false)
  const [followupDrafts, setFollowupDrafts] = useState<Record<string, Record<string, FollowupAnswerDraft>>>({})
  const [operationCardReplyDrafts, setOperationCardReplyDrafts] = useState<Record<string, string>>({})
  const [chatQueue, setChatQueue] = useState<ChatQueueItem[]>([])
  const [workflowQueue, setWorkflowQueue] = useState<WorkflowQueueItem[]>([])
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const isComposingRef = useRef(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const activeChatAbortRef = useRef<AbortController | null>(null)
  const activeChatJobRef = useRef<ChatQueueItem | null>(null)
  const activeWorkflowAbortRef = useRef<AbortController | null>(null)
  const activeWorkflowJobRef = useRef<WorkflowQueueItem | null>(null)
  const previousConversationIdRef = useRef<string | null>(null)

  const focusTextInput = useCallback(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }, [])

  const syncInputHeight = useCallback(() => {
    const element = inputRef.current
    if (!element || inputMode !== 'text') {
      return
    }

    element.style.height = '0px'
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`
  }, [inputMode])

  const switchToTextInput = useCallback(() => {
    setInputMode('text')
    focusTextInput()
  }, [focusTextInput])

  const handleVoiceTranscriptionComplete = useCallback(
    (text: string) => {
      const normalizedText = text.trim()
      if (!normalizedText) {
        return
      }

      setInput((prev) => {
        if (!prev.trim()) {
          return normalizedText
        }

        const trimmed = prev.trimEnd()
        const separator = trimmed.endsWith('\n') ? '' : '\n'
        return `${trimmed}${separator}${normalizedText}`
      })

      switchToTextInput()
    },
    [switchToTextInput]
  )

  useEffect(() => {
    try {
      const raw = localStorage.getItem('aiChat.useKnowledgeBase')
      setUseKnowledgeBase(raw === 'true')
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('aiChat.useKnowledgeBase', String(useKnowledgeBase))
    } catch {
      // ignore
    }
  }, [useKnowledgeBase])

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
        const loaded = detail.messages as UiMessage[]
        setMessages(loaded)
        const lastAssistant = [...loaded].reverse().find((m) => m.role === 'assistant')
        setWorkflowFollowupMode(
          lastAssistant ? isWorkflowFollowupMessage(lastAssistant.content || '') : false
        )
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
  }, [messages.length, sending, runningWorkflow, chatQueue.length, workflowQueue.length])

  useEffect(() => {
    const previousConversationId = previousConversationIdRef.current
    if (previousConversationId && previousConversationId !== currentId) {
      setChatQueue([])
      activeChatAbortRef.current?.abort()
      setWorkflowQueue([])
      const workflowConversationId = activeWorkflowJobRef.current?.conversationId
      activeWorkflowAbortRef.current?.abort()
      if (workflowConversationId) {
        void cancelBlogWorkflow({ conversationId: workflowConversationId }).catch(() => undefined)
      }
    }
    previousConversationIdRef.current = currentId
  }, [currentId])

  useEffect(() => {
    if (sending || runningWorkflow) return
    const nextJob = chatQueue[0]
    if (!nextJob) return
    if (!currentId || nextJob.conversationId !== currentId) return

    setChatQueue((prev) => prev.slice(1))
    void executeChatJob(nextJob)
  }, [chatQueue, currentId, runningWorkflow, sending])

  useEffect(() => {
    if (sending || runningWorkflow) return
    const nextJob = workflowQueue[0]
    if (!nextJob) return
    if (!currentId || nextJob.conversationId !== currentId) return

    setWorkflowQueue((prev) => prev.slice(1))
    void executeWorkflowJob(nextJob)
  }, [currentId, runningWorkflow, sending, workflowQueue])

  useEffect(() => {
    return () => {
      activeChatAbortRef.current?.abort()
      cancelActiveWorkflowRequest()
    }
  }, [])

  useEffect(() => {
    syncInputHeight()
  }, [input, inputMode, syncInputHeight])

  async function handleCreateConversation() {
    try {
      const conv = await createConversation()
      setConversations((prev) => [conv, ...prev])
      setCurrentId(conv.id)
      setMobileSessionsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function handleSelectConversation(conversationId: string) {
    setCurrentId(conversationId)
    setMobileSessionsOpen(false)
  }

  async function handleDeleteConversation(conversationId: string) {
    const target = conversations.find((item) => item.id === conversationId)
    const title = getConversationDisplayTitle(target?.title)
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`确认删除会话「${title}」吗？删除后无法恢复。`)
      if (!confirmed) return
    }

    try {
      await deleteConversation(conversationId)
      const nextList = conversations.filter((item) => item.id !== conversationId)
      setConversations(nextList)

      if (currentId === conversationId) {
        const nextCurrentId = nextList[0]?.id ?? null
        setCurrentId(nextCurrentId)
        if (!nextCurrentId) {
          setMessages([])
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除会话失败')
    }
  }

  function buildChatQueueItem(content: string, assistantContent = ''): ChatQueueItem {
    if (!currentId) {
      throw new Error('当前没有可用会话')
    }

    const conversationId = currentId
    const timestamp = Date.now()
    const userMsg: UiMessage = {
      id: `local-user-${timestamp}`,
      conversationId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      pending: true,
      queued: Boolean(assistantContent),
    }
    const assistantMsg: UiMessage = {
      id: `local-assistant-${timestamp}`,
      conversationId,
      role: 'assistant',
      content: assistantContent,
      createdAt: new Date().toISOString(),
      pending: true,
      queued: Boolean(assistantContent),
      progress: null,
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])

    return {
      id: `chat-job-${timestamp}`,
      conversationId,
      content,
      useKnowledgeBase,
      userMsgId: userMsg.id,
      assistantMsgId: assistantMsg.id,
    }
  }

  function markChatJobAsActive(job: ChatQueueItem) {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id === job.userMsgId) {
          return {
            ...message,
            pending: true,
            queued: false,
          }
        }

        if (message.id === job.assistantMsgId) {
          return {
            ...message,
            content: '',
            pending: true,
            queued: false,
            interrupted: false,
            progress: null,
          }
        }

        return message
      })
    )
  }

  function finishChatJob(job: ChatQueueItem) {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === job.userMsgId || message.id === job.assistantMsgId
          ? { ...message, pending: false, queued: false, progress: null }
          : message
      )
    )
  }

  function markChatJobInterrupted(job: ChatQueueItem) {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id === job.userMsgId) {
          return {
            ...message,
            pending: false,
            queued: false,
          }
        }

        if (message.id === job.assistantMsgId) {
          const interruptedContent = message.content.trim()
            ? `${message.content.trim()}\n\n[本次回答已中断]`
            : '本次回答已中断。'
          return {
            ...message,
            content: interruptedContent,
            pending: false,
            queued: false,
            interrupted: true,
            progress: null,
          }
        }

        return message
      })
    )
  }

  function removeChatJob(job: ChatQueueItem) {
    setMessages((prev) =>
      prev.filter((message) => message.id !== job.userMsgId && message.id !== job.assistantMsgId)
    )
  }

  async function executeChatJob(job: ChatQueueItem) {
    if (!currentId || job.conversationId !== currentId) return

    markChatJobAsActive(job)
    setSending(true)
    setError(null)
    activeChatJobRef.current = job

    const controller = new AbortController()
    activeChatAbortRef.current = controller
    let receivedContent = false
    let finalAssistantContent = ''

    try {
      await streamChatMessage(
        job.conversationId,
        job.content,
        (chunk) => {
          const isFirstChunk = !receivedContent
          receivedContent = true
          finalAssistantContent = isFirstChunk ? chunk : finalAssistantContent + chunk
          setMessages((prev) =>
            prev.map((m) =>
              m.id === job.assistantMsgId
                ? {
                    ...m,
                    progress: {
                      mode: 'chat',
                      status: 'responding',
                      label: '我正在回复你',
                    },
                    content: isFirstChunk ? chunk : (m.content ?? '') + chunk,
                  }
                : m
            )
          )
        },
        (err) => {
          setError(err)
        },
        {
          useKnowledgeBase: job.useKnowledgeBase,
          signal: controller.signal,
          onEvent: (event) => {
            const progress = toChatProgressState(event)
            if (!progress || receivedContent) {
              return
            }

            setMessages((prev) =>
              prev.map((message) =>
                message.id === job.assistantMsgId
                  ? { ...message, progress }
                  : message
              )
            )
          },
        }
      )
      if (!finalAssistantContent.trim()) {
        finalAssistantContent = '我整理好了，但这次没有生成可展示内容。你可以换个问法，或者补充更多细节。'
        setMessages((prev) =>
          prev.map((message) =>
            message.id === job.assistantMsgId
              ? {
                  ...message,
                  content: finalAssistantContent,
                  progress: null,
                }
              : message
          )
        )
      }
      finishChatJob(job)
      setWorkflowFollowupMode(isWorkflowFollowupMessage(finalAssistantContent))
      listConversations()
        .then((list) => setConversations(list))
        .catch(() => undefined)
    } catch (err: unknown) {
      if (isAbortError(err)) {
        markChatJobInterrupted(job)
        listConversations()
          .then((list) => setConversations(list))
          .catch(() => undefined)
      } else {
        setError(err instanceof Error ? err.message : String(err))
        removeChatJob(job)
      }
    } finally {
      if (activeChatAbortRef.current === controller) {
        activeChatAbortRef.current = null
      }
      if (activeChatJobRef.current?.id === job.id) {
        activeChatJobRef.current = null
      }
      setSending(false)
    }
  }

  async function handleSend() {
    if (
      !currentId ||
      !input.trim() ||
      sending ||
      chatQueue.length > 0 ||
      runningWorkflow ||
      workflowQueue.length > 0
    ) {
      return
    }
    const content = input.trim()
    setInput('')
    const job = buildChatQueueItem(content)
    await executeChatJob(job)
  }

  function handleQueueSend() {
    if (
      !currentId ||
      !input.trim() ||
      !sending ||
      runningWorkflow ||
      workflowQueue.length > 0
    ) {
      return
    }
    const content = input.trim()
    setInput('')
    const job = buildChatQueueItem(content, '已加入队列，等待当前回复结束…')
    setChatQueue((prev) => [...prev, job])
  }

  function handleInterruptAndSend() {
    if (
      !currentId ||
      !input.trim() ||
      !sending ||
      runningWorkflow ||
      workflowQueue.length > 0
    ) {
      return
    }
    const content = input.trim()
    setInput('')
    const job = buildChatQueueItem(content, '正在中断当前回答，并准备继续处理…')
    setChatQueue((prev) => [job, ...prev])
    activeChatAbortRef.current?.abort()
  }

  function buildWorkflowQueueItem(
    content: string,
    assistantContent: string,
    options?: { queued?: boolean }
  ): WorkflowQueueItem {
    if (!currentId) {
      throw new Error('当前没有可用会话')
    }

    const conversationId = currentId
    const timestamp = Date.now()
    const queued = options?.queued === true
    const userMsg: UiMessage = {
      id: `local-workflow-user-${timestamp}`,
      conversationId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      pending: true,
      queued,
    }
    const assistantMsg: UiMessage = {
      id: `local-workflow-assistant-${timestamp}`,
      conversationId,
      role: 'assistant',
      content: assistantContent,
      createdAt: new Date().toISOString(),
      pending: true,
      queued,
      progress: null,
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])

    return {
      id: `workflow-job-${timestamp}`,
      conversationId,
      content,
      publishDirectly: true,
      userMsgId: userMsg.id,
      assistantMsgId: assistantMsg.id,
    }
  }

  function markWorkflowJobAsActive(job: WorkflowQueueItem) {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id === job.userMsgId) {
          return {
            ...message,
            pending: true,
            queued: false,
          }
        }

        if (message.id === job.assistantMsgId) {
          return {
            ...message,
            content: '',
            pending: true,
            queued: false,
            interrupted: false,
            progress: null,
          }
        }

        return message
      })
    )
  }

  function finishWorkflowJob(job: WorkflowQueueItem, assistantContent: string) {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id === job.userMsgId) {
          return {
            ...message,
            pending: false,
            queued: false,
          }
        }

        if (message.id === job.assistantMsgId) {
          return {
            ...message,
            content: assistantContent,
            pending: false,
            queued: false,
            interrupted: false,
            progress: null,
          }
        }

        return message
      })
    )
  }

  function markWorkflowJobInterrupted(job: WorkflowQueueItem) {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id === job.userMsgId) {
          return {
            ...message,
            pending: false,
            queued: false,
          }
        }

        if (message.id === job.assistantMsgId) {
          const interruptedContent = message.content.trim()
            ? `${message.content.trim()}\n\n[本次生成已中断]`
            : '本次生成已中断。'
          return {
            ...message,
            content: interruptedContent,
            pending: false,
            queued: false,
            interrupted: true,
            progress: null,
          }
        }

        return message
      })
    )
  }

  function removeWorkflowJob(job: WorkflowQueueItem) {
    setMessages((prev) =>
      prev.filter((message) => message.id !== job.userMsgId && message.id !== job.assistantMsgId)
    )
  }

  function cancelActiveWorkflowRequest() {
    const workflowConversationId = activeWorkflowJobRef.current?.conversationId
    activeWorkflowAbortRef.current?.abort()
    if (workflowConversationId) {
      void cancelBlogWorkflow({ conversationId: workflowConversationId }).catch(() => undefined)
    }
  }

  async function executeWorkflowJob(job: WorkflowQueueItem) {
    if (!currentId || job.conversationId !== currentId) return

    markWorkflowJobAsActive(job)
    setRunningWorkflow(true)
    setWorkflowFollowupMode(false)
    setError(null)
    activeWorkflowJobRef.current = job

    const controller = new AbortController()
    activeWorkflowAbortRef.current = controller
    let finalResult: BlogWorkflowResult | null = null

    try {
      await streamBlogWorkflow(
        {
          conversationId: job.conversationId,
          message: job.content,
          publishDirectly: job.publishDirectly,
        },
        {
          onEvent: (event) => {
            const progress = toChatProgressState(event)
            if (!progress) {
              return
            }

            setMessages((prev) =>
              prev.map((message) =>
                message.id === job.assistantMsgId
                  ? { ...message, progress }
                  : message
              )
            )
          },
          onResult: (result) => {
            finalResult = result
          },
          onError: (err) => {
            setError(err)
          },
        },
        {
          signal: controller.signal,
        }
      )

      const result = finalResult as BlogWorkflowResult | null
      if (!result) {
        throw new Error('博客工作流未返回结果')
      }

      setWorkflowFollowupMode(result.status === 'need_more_info')
      finishWorkflowJob(job, formatWorkflowAssistantMessage(result))
      listConversations()
        .then((list) => setConversations(list))
        .catch(() => undefined)
    } catch (err: unknown) {
      if (isAbortError(err)) {
        markWorkflowJobInterrupted(job)
        listConversations()
          .then((list) => setConversations(list))
          .catch(() => undefined)
      } else {
        setError(err instanceof Error ? err.message : String(err))
        removeWorkflowJob(job)
      }
    } finally {
      if (activeWorkflowAbortRef.current === controller) {
        activeWorkflowAbortRef.current = null
      }
      if (activeWorkflowJobRef.current?.id === job.id) {
        activeWorkflowJobRef.current = null
      }
      setRunningWorkflow(false)
    }
  }

  async function runWorkflowFromInput(
    content: string,
    assistantContent: string,
    options?: { clearInput?: boolean }
  ) {
    if (
      !currentId ||
      !content.trim() ||
      sending ||
      chatQueue.length > 0 ||
      runningWorkflow ||
      workflowQueue.length > 0
    ) {
      return
    }
    if (options?.clearInput !== false) {
      setInput('')
    }
    const job = buildWorkflowQueueItem(content.trim(), assistantContent)
    await executeWorkflowJob(job)
  }

  function queueWorkflowFromInput(
    content: string,
    assistantContent: string,
    options?: { clearInput?: boolean; prepend?: boolean }
  ) {
    if (!currentId || !content.trim() || !runningWorkflow) return
    if (options?.clearInput !== false) {
      setInput('')
    }
    const job = buildWorkflowQueueItem(content.trim(), assistantContent, {
      queued: true,
    })
    setWorkflowQueue((prev) => (options?.prepend ? [job, ...prev] : [...prev, job]))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const nativeEvent = e.nativeEvent as KeyboardEvent

    if (isComposingRef.current || nativeEvent.isComposing || nativeEvent.keyCode === 229) {
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (runningWorkflow) {
        queueWorkflowFromInput(input, '已加入生成队列，等待当前任务结束…')
      } else if (workflowFollowupMode) {
        void handleWorkflowFollowupSend()
      } else if (sending) {
        handleQueueSend()
      } else {
        void handleSend()
      }
    }
  }

  async function submitWorkflowFollowup(content: string, options?: { clearInput?: boolean }) {
    const trimmedContent = content.trim()
    if (!trimmedContent) {
      return
    }

    await runWorkflowFromInput(trimmedContent, '正在根据你补充的信息继续生成…', options)
  }

  async function handleWorkflowFollowupSend() {
    await submitWorkflowFollowup(input)
  }

  async function handleWorkflowFollowupUseDefaults(questions: string[]) {
    const defaultReply = `以下问题我没有额外要求，请你按合理默认值自行补全并继续生成，不必再次提问：\n${questions
      .map((question, idx) => `${idx + 1}. ${question}`)
      .join('\n')}`
    await submitWorkflowFollowup(defaultReply, { clearInput: false })
  }

  function getOperationCardReplyDraft(messageId: string): string {
    return operationCardReplyDrafts[messageId] ?? ''
  }

  function setOperationCardReplyDraft(messageId: string, value: string) {
    setOperationCardReplyDrafts((prev) => ({
      ...prev,
      [messageId]: value,
    }))
  }

  async function sendChatOperationMessage(content: string) {
    if (
      !currentId ||
      !content.trim() ||
      sending ||
      chatQueue.length > 0 ||
      runningWorkflow ||
      workflowQueue.length > 0
    ) {
      return
    }

    const job = buildChatQueueItem(content.trim())
    await executeChatJob(job)
  }

  async function handleOperationCardAction(action: OperationCardAction) {
    if (action.type === 'open_url') {
      window.open(action.url, '_blank', 'noopener,noreferrer')
      return
    }

    if (action.mode === 'workflow') {
      await submitWorkflowFollowup(action.message, { clearInput: false })
      return
    }

    await sendChatOperationMessage(action.message)
  }

  async function handleSubmitOperationCardReply(messageId: string, card: FollowupOperationCard) {
    const content = getOperationCardReplyDraft(messageId).trim()
    if (!content) {
      return
    }

    if (card.submitMode === 'workflow') {
      await submitWorkflowFollowup(content, { clearInput: false })
    } else {
      await sendChatOperationMessage(content)
    }

    setOperationCardReplyDraft(messageId, '')
  }

  function getFollowupAnswerDraft(messageId: string, questionId: string): FollowupAnswerDraft {
    return followupDrafts[messageId]?.[questionId] ?? getEmptyFollowupAnswerDraft()
  }

  function updateFollowupAnswerDraft(
    messageId: string,
    questionId: string,
    updater: (draft: FollowupAnswerDraft) => FollowupAnswerDraft
  ) {
    setFollowupDrafts((prev) => {
      const messageDrafts = prev[messageId] ?? {}
      const currentDraft = messageDrafts[questionId] ?? getEmptyFollowupAnswerDraft()
      return {
        ...prev,
        [messageId]: {
          ...messageDrafts,
          [questionId]: updater(currentDraft),
        },
      }
    })
  }

  function toggleFollowupOption(messageId: string, spec: FollowupQuestionSpec, option: string) {
    updateFollowupAnswerDraft(messageId, spec.id, (draft) => {
      if (spec.multiple) {
        const exists = draft.selectedOptions.includes(option)
        return {
          ...draft,
          selectedOptions: exists
            ? draft.selectedOptions.filter((item) => item !== option)
            : [...draft.selectedOptions, option],
        }
      }

      return {
        ...draft,
        selectedOptions: draft.selectedOptions[0] === option ? [] : [option],
      }
    })
  }

  function handleFollowupCustomTextChange(messageId: string, questionId: string, value: string) {
    updateFollowupAnswerDraft(messageId, questionId, (draft) => ({
      ...draft,
      customText: value,
    }))
  }

  function hasFollowupSelections(messageId: string, specs: FollowupQuestionSpec[]): boolean {
    return specs.some((spec) => {
      const draft = getFollowupAnswerDraft(messageId, spec.id)
      return draft.selectedOptions.length > 0 || draft.customText.trim().length > 0
    })
  }

  function buildFollowupFormSubmission(messageId: string, specs: FollowupQuestionSpec[]): string {
    return `请根据以下表单补充继续生成博客：\n${specs
      .map((spec, index) => {
        const draft = getFollowupAnswerDraft(messageId, spec.id)
        const answer = draft.customText.trim() || draft.selectedOptions.join('、') || '按合理默认值处理'
        return `${index + 1}. ${spec.title}：${answer}`
      })
      .join('\n')}\n若未特别说明的细节，请按合理默认值处理。`
  }

  async function handleSubmitFollowupForm(messageId: string, specs: FollowupQuestionSpec[]) {
    if (!hasFollowupSelections(messageId, specs)) return
    await submitWorkflowFollowup(buildFollowupFormSubmission(messageId, specs), { clearInput: false })
  }

  function formatWorkflowAssistantMessage(result: BlogWorkflowResult): string {
    if (result.status === 'need_more_info') {
      return buildWorkflowFollowupOperationCardMessage(result.followupQuestions, {
        phase: 'continue',
      })
    }
    if (result.status === 'published') {
      return `文章已生成并发布。\n\n标题：${result.post.title}\n链接：[点击查看](${result.postUrl})`
    }
    return `文章已生成并保存为草稿。\n\n标题：${result.post.title}\n链接：[点击查看](${result.postUrl})`
  }

  const hasPendingChatJobs = sending || chatQueue.length > 0
  const hasPendingWorkflowJobs = runningWorkflow || workflowQueue.length > 0
  const canUseWorkflowActions = Boolean(currentId) && !hasPendingChatJobs
  const canUseChatActions = Boolean(currentId) && !hasPendingWorkflowJobs
  const voiceInputDisabled = !currentId || sending || runningWorkflow
  const voiceToggleDisabled = inputMode === 'voice' ? false : voiceInputDisabled

  const currentConversation = conversations.find((conv) => conv.id === currentId) ?? null
  const currentConversationTitle = currentConversation?.title?.trim() ?? ''
  const currentConversationDisplayTitle = currentConversationTitle || '当前会话'
  const currentConversationIsUntitled = !currentConversationTitle
  const panelClass =
    'rounded-[1.5rem] border border-line-glass bg-surface-glass/88 shadow-[0_18px_48px_rgba(15,23,42,0.06)] backdrop-blur-lg'
  const sessionPanel = (
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
            onClick={handleCreateConversation}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-primary px-3 py-2.5 text-sm font-medium text-white shadow-md transition-colors hover:bg-accent-primary/90"
          >
            <Plus className="h-4 w-4" />
            新建会话
          </button>
        </div>
      </div>
      <div className={`${panelClass} flex min-h-0 flex-1 flex-col overflow-hidden p-2`}>
        <div className="border-b border-line-glass/60 px-2 pb-3 pt-1">
          <div className="text-[11px] uppercase tracking-[0.28em] text-content-muted">Sessions</div>
          <div className="mt-2 text-sm text-content-secondary">
            当前共 {conversations.length} 个会话
          </div>
        </div>
        {loadingConversations ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-4 text-sm text-content-secondary">暂无会话，先发一条消息试试吧。</p>
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
                      onChange={(e) => setEditingTitle(e.target.value.slice(0, 100))}
                      onBlur={async () => {
                        const title = editingTitle.trim()
                        setEditingId(null)
                        if (title === (conv.title ?? '')) return
                        try {
                          const updated = await updateConversation(conv.id, {
                            title: title || '',
                          })
                          setConversations((prev) =>
                            prev.map((c) => (c.id === conv.id ? { ...c, title: updated.title } : c))
                          )
                        } catch {
                          setEditingId(conv.id)
                          setEditingTitle(conv.title ?? '')
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur()
                        } else if (e.key === 'Escape') {
                          setEditingTitle(conv.title ?? '')
                          setEditingId(null)
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
                    onClick={() => handleSelectConversation(conv.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSelectConversation(conv.id)
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
                      <div className="truncate font-medium">
                        {getConversationDisplayTitle(conv.title)}
                      </div>
                      <div className="mt-1 text-[11px] text-content-tertiary">
                        共 {conv.messageCount} 条消息
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(conv.id)
                        setEditingTitle(conv.title ?? '')
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
                        void handleDeleteConversation(conv.id)
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

  return (
    <main className="mx-auto grid w-full max-w-[1240px] gap-4 px-4 pb-6 pt-24 sm:pt-28 md:pb-8 min-[760px]:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[252px_minmax(0,1fr)]">
      <section className="hidden min-h-[24rem] flex-col min-[760px]:sticky min-[760px]:top-6 min-[760px]:flex min-[760px]:h-[calc(100vh-7rem)]">
        {sessionPanel}
      </section>

      <section className="flex min-h-[60vh] min-w-0 flex-col min-[760px]:h-[calc(100vh-7rem)]">
        <div className={`${panelClass} flex min-w-0 flex-1 flex-col overflow-hidden p-4 md:p-5`}>
          <div className="mx-auto mb-4 flex w-full min-w-0 max-w-full items-center justify-between gap-3 border-b border-line-glass/60 pb-4">
            <div className="min-w-0 flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileSessionsOpen(true)}
                className="inline-flex h-10 w-6 shrink-0 items-center justify-center rounded-2xl border border-line-glass bg-surface-glass/56 text-content-secondary transition-colors hover:border-accent-primary/20 hover:text-content-primary min-[760px]:hidden"
                aria-label="打开历史会话"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 truncate text-lg font-semibold tracking-[-0.03em] text-content-primary sm:text-xl">
                  {currentConversationDisplayTitle}
                </h1>
                {currentConversationIsUntitled && (
                  <span className="inline-flex items-center rounded-full border border-accent-primary/20 bg-accent-primary/8 px-2.5 py-1 text-xs font-medium text-accent-primary">
                    未命名
                  </span>
                )}
              </div>
            </div>
          </div>
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
            <div className="hide-scrollbar min-w-0 flex-1 overflow-x-hidden overflow-y-auto pb-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-content-secondary">
                  还没有消息，试着问问 AI 一个问题吧～
                </div>
              ) : (
                <div className="mx-auto flex w-full min-w-0 max-w-full flex-col gap-4 pr-1">
                  {messages.map((msg, index) => {
                    const operationCard =
                      msg.role === 'assistant' ? parseOperationCardContent(msg.content || '') : null
                    const isWorkflowFollowup =
                      operationCard?.kind === 'followup' && operationCard.submitMode === 'workflow'
                    const followupQuestions = isWorkflowFollowup ? operationCard.questions : []
                    const followupSpecs = followupQuestions.map((question, questionIndex) =>
                      buildFollowupQuestionSpec(question, questionIndex)
                    )
                    const isLatestResolvedAssistantMessage =
                      msg.role === 'assistant' && index === messages.length - 1 && !msg.pending
                    const showWorkflowFollowupActions =
                      isWorkflowFollowup &&
                      workflowFollowupMode &&
                      isLatestResolvedAssistantMessage
                    const showChatFollowupActions =
                      operationCard?.kind === 'followup' &&
                      operationCard.submitMode === 'chat' &&
                      isLatestResolvedAssistantMessage
                    const showConfirmActions =
                      operationCard?.kind === 'confirm' && isLatestResolvedAssistantMessage
                    const defaultReplyMessage =
                      operationCard?.kind === 'followup' ? operationCard.defaultReplyMessage : undefined

                    return (
                      <div
                        key={msg.id}
                        className={`flex min-w-0 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`relative min-w-0 max-w-[85%] overflow-x-hidden break-words rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[85%] ${
                            msg.role === 'user'
                              ? 'bg-accent-primary text-white'
                              : 'bg-surface-tertiary/90 text-content-primary'
                          }`}
                        >
                        {msg.queued && (
                          <div className="mb-2 text-[11px] font-medium text-content-tertiary">
                            排队中
                          </div>
                        )}
                        {msg.interrupted && (
                          <div className="mb-2 text-[11px] font-medium text-ui-warning-text">
                            已中断
                          </div>
                        )}
                        {msg.role === 'assistant' && msg.progress && msg.pending && (
                          <AgentStatusCard
                            mode={msg.progress.mode}
                            status={msg.progress.status}
                            label={msg.progress.label}
                          />
                        )}
                        {msg.role === 'assistant' ? (
                          operationCard ? (
                            <div
                              className={`rounded-2xl border p-3 ${
                                operationCard.kind === 'confirm' && operationCard.emphasis === 'danger'
                                  ? 'border-red-500/20 bg-red-500/6'
                                  : 'border-line-glass/70 bg-surface-glass/60'
                              }`}
                            >
                              <div className="text-[11px] font-semibold tracking-[0.18em] text-content-tertiary">
                                {operationCard.kind === 'confirm' ? '操作确认卡片' : '操作卡片'}
                              </div>
                              <div className="mt-2 text-sm font-semibold text-content-primary">
                                {operationCard.title}
                              </div>
                              {operationCard.description && (
                                <div className="mt-1 text-xs leading-5 text-content-secondary">
                                  {operationCard.description}
                                </div>
                              )}

                              {operationCard.kind === 'followup' && operationCard.questions.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {operationCard.questions.map((question, questionIndex) => (
                                    <div
                                      key={`${msg.id}-question-${questionIndex}`}
                                      className="rounded-xl border border-line-glass/70 bg-surface-glass/55 px-3 py-2"
                                    >
                                      <div className="text-[11px] font-medium text-content-tertiary">
                                        问题 {questionIndex + 1}
                                      </div>
                                      <div className="mt-1 text-xs leading-5 text-content-primary">
                                        {question}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {operationCard.kind === 'confirm' && (
                                <>
                                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {operationCard.details.map((detail) => (
                                      <div
                                        key={`${msg.id}-${detail.label}`}
                                        className="rounded-xl border border-line-glass/70 bg-surface-glass/55 px-3 py-2"
                                      >
                                        <div className="text-[11px] font-medium text-content-tertiary">
                                          {detail.label}
                                        </div>
                                        <div className="mt-1 break-all text-xs leading-5 text-content-primary">
                                          {detail.value}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {operationCard.sections && operationCard.sections.length > 0 && (
                                    <div className="mt-3 space-y-3">
                                      {operationCard.sections.map((section) => (
                                        <div
                                          key={`${msg.id}-${section.title}`}
                                          className="rounded-xl border border-line-glass/70 bg-surface-glass/55 p-3"
                                        >
                                          <div className="text-[11px] font-semibold tracking-[0.14em] text-content-tertiary">
                                            {section.title}
                                          </div>
                                          <div className="mt-2 space-y-2">
                                            {section.items.map((item, itemIndex) => (
                                              <div
                                                key={`${msg.id}-${section.title}-${itemIndex}`}
                                                className="rounded-lg bg-white/70 px-3 py-2 text-xs leading-5 text-content-primary"
                                              >
                                                {item}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {operationCard.actions
                                      .filter((action) => action.type === 'open_url')
                                      .map((action) => (
                                        <button
                                          key={`${msg.id}-${action.label}`}
                                          type="button"
                                          onClick={() => {
                                            void handleOperationCardAction(action)
                                          }}
                                          className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${getOperationActionButtonClass(
                                            action.style
                                          )}`}
                                        >
                                          {action.label}
                                        </button>
                                      ))}
                                  </div>
                                </>
                              )}

                              {showWorkflowFollowupActions && operationCard.kind === 'followup' && (
                                <div className="mt-4 border-t border-line-glass/70 pt-3">
                                  <div className="mb-2 text-xs font-medium text-content-secondary">
                                    通过操作卡补充信息后直接继续生成：
                                  </div>
                                  <div className="space-y-3">
                                    {followupSpecs.map((spec) => {
                                      const draft = getFollowupAnswerDraft(msg.id, spec.id)

                                      return (
                                        <div
                                          key={spec.id}
                                          className="rounded-xl border border-line-glass/70 bg-surface-glass/60 p-3"
                                        >
                                          <div className="text-xs font-medium text-content-primary">
                                            {spec.title}
                                          </div>
                                          <div className="mt-1 text-[11px] leading-5 text-content-secondary">
                                            {spec.question}
                                          </div>
                                          <div className="mt-2 flex flex-wrap gap-2">
                                            {spec.options.map((option) => {
                                              const selected = draft.selectedOptions.includes(option)
                                              return (
                                                <button
                                                  key={option}
                                                  type="button"
                                                  onClick={() => toggleFollowupOption(msg.id, spec, option)}
                                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                                    selected
                                                      ? 'border-accent-primary/30 bg-accent-primary/12 text-accent-primary'
                                                      : 'border-line-glass bg-surface-glass/70 text-content-secondary hover:border-accent-primary/20 hover:text-content-primary'
                                                  }`}
                                                >
                                                  {option}
                                                </button>
                                              )
                                            })}
                                          </div>
                                          <textarea
                                            className="mt-3 w-full resize-none rounded-xl border border-line-glass bg-surface-glass px-3 py-2 text-xs text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                                            rows={2}
                                            value={draft.customText}
                                            onChange={(e) =>
                                              handleFollowupCustomTextChange(
                                                msg.id,
                                                spec.id,
                                                e.currentTarget.value
                                              )
                                            }
                                            placeholder={spec.placeholder}
                                            disabled={!canUseWorkflowActions || runningWorkflow}
                                          />
                                        </div>
                                      )
                                    })}
                                  </div>
                                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void handleSubmitFollowupForm(msg.id, followupSpecs)
                                      }}
                                      disabled={
                                        !canUseWorkflowActions ||
                                        runningWorkflow ||
                                        !hasFollowupSelections(msg.id, followupSpecs)
                                      }
                                      className="inline-flex items-center justify-center rounded-xl bg-accent-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {operationCard.submitLabel || '按所选继续生成'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void handleWorkflowFollowupUseDefaults(followupQuestions)
                                      }}
                                      disabled={!canUseWorkflowActions || runningWorkflow}
                                      className="inline-flex items-center justify-center rounded-xl border border-accent-primary/30 bg-accent-primary/8 px-3 py-2 text-xs font-medium text-accent-primary transition-colors hover:bg-accent-primary/12 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {operationCard.defaultReplyLabel || '全部按默认继续'}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {showChatFollowupActions && operationCard.kind === 'followup' && (
                                <div className="mt-4 border-t border-line-glass/70 pt-3">
                                  {operationCard.quickReplies && operationCard.quickReplies.length > 0 && (
                                    <div className="mb-3 flex flex-wrap gap-2">
                                      {operationCard.quickReplies.map((reply) => (
                                        <button
                                          key={`${msg.id}-${reply}`}
                                          type="button"
                                          onClick={() => {
                                            setOperationCardReplyDraft(msg.id, reply)
                                          }}
                                          disabled={!canUseChatActions || sending}
                                          className="inline-flex rounded-full border border-line-glass bg-surface-glass/70 px-2.5 py-1 text-[11px] font-medium text-content-secondary transition-colors hover:border-accent-primary/20 hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          {reply}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <textarea
                                    className="w-full resize-none rounded-xl border border-line-glass bg-surface-glass px-3 py-2 text-xs text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                                    rows={3}
                                    value={getOperationCardReplyDraft(msg.id)}
                                    onChange={(e) =>
                                      setOperationCardReplyDraft(msg.id, e.currentTarget.value)
                                    }
                                    placeholder={
                                      operationCard.inputPlaceholder || '直接填写补充信息后发送'
                                    }
                                    disabled={!canUseChatActions || sending}
                                  />
                                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void handleSubmitOperationCardReply(msg.id, operationCard)
                                      }}
                                      disabled={
                                        !canUseChatActions ||
                                        sending ||
                                        !getOperationCardReplyDraft(msg.id).trim()
                                      }
                                      className="inline-flex items-center justify-center rounded-xl bg-accent-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {operationCard.submitLabel || '发送补充信息'}
                                    </button>
                                    {defaultReplyMessage && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void handleOperationCardAction({
                                            type: 'send_message',
                                            label:
                                              operationCard.defaultReplyLabel || '按默认继续',
                                            message: defaultReplyMessage,
                                            mode: operationCard.submitMode,
                                            style: 'secondary',
                                          })
                                        }}
                                        disabled={!canUseChatActions || sending}
                                        className="inline-flex items-center justify-center rounded-xl border border-accent-primary/30 bg-accent-primary/8 px-3 py-2 text-xs font-medium text-accent-primary transition-colors hover:bg-accent-primary/12 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        {operationCard.defaultReplyLabel || '按默认继续'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {showConfirmActions && operationCard.kind === 'confirm' && (
                                <div className="mt-4 flex flex-wrap gap-2 border-t border-line-glass/70 pt-3">
                                  {operationCard.actions
                                    .filter((action) => action.type === 'send_message')
                                    .map((action) => (
                                      <button
                                        key={`${msg.id}-${action.label}`}
                                        type="button"
                                        onClick={() => {
                                          void handleOperationCardAction(action)
                                        }}
                                        disabled={!canUseChatActions || sending}
                                        className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${getOperationActionButtonClass(
                                          action.style
                                        )}`}
                                      >
                                        {action.label}
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="md-content max-w-none break-words">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  table: ({ children, ...props }) => (
                                    <div className="md-table-wrapper">
                                      <table {...props}>{children}</table>
                                    </div>
                                  ),
                                  a: ({ children, ...props }) => (
                                    <a {...props} target="_blank" rel="noopener noreferrer">
                                      {children}
                                    </a>
                                  ),
                                }}
                              >
                                {msg.content || ''}
                              </ReactMarkdown>
                            </div>
                          )
                        ) : (
                          <span className="whitespace-pre-wrap break-words">
                            {msg.content}
                          </span>
                        )}
                      </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className={`${panelClass} mt-3 min-w-0 p-3 md:p-4`}>
          <div className="mx-auto flex w-full min-w-0 max-w-full flex-col gap-3">
            <div className="flex w-full min-w-0 items-end gap-3">
              <div className="min-w-0 flex-1">
                {inputMode === 'voice' ? (
                  <VoiceRecorder
                    onTranscriptionComplete={handleVoiceTranscriptionComplete}
                    disabled={voiceInputDisabled}
                    maxDuration={60}
                  />
                ) : (
                  <textarea
                    ref={inputRef}
                    className="hide-scrollbar max-h-40 w-full resize-none overflow-y-auto rounded-2xl border border-line-glass bg-surface-tertiary/40 px-3 py-[0.8rem] text-sm leading-6 text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                    rows={1}
                    placeholder={
                      runningWorkflow
                        ? '继续输入内容，按 Enter 加入队列…'
                        : workflowFollowupMode
                          ? '补充生成要求，按 Enter 继续生成，Shift+Enter 换行…'
                          : sending
                            ? '继续输入内容，按 Enter 加入队列，或点击中断并发送…'
                            : '输入你的问题，按 Enter 发送，Shift+Enter 换行…'
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onCompositionStart={() => {
                      isComposingRef.current = true
                    }}
                    onCompositionEnd={() => {
                      isComposingRef.current = false
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={!currentId}
                  />
                )}
              </div>
            </div>

            <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setUseKnowledgeBase((prev) => !prev)}
                aria-pressed={useKnowledgeBase}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl border px-3 text-sm font-medium transition-colors ${
                  useKnowledgeBase
                    ? 'border-accent-primary/30 bg-accent-primary/10 text-accent-primary'
                    : 'border-line-glass bg-white/70 text-content-secondary hover:border-accent-primary/20 hover:text-content-primary'
                }`}
              >
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">知识库</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (inputMode === 'voice') {
                    switchToTextInput()
                    return
                  }

                  if (voiceToggleDisabled) {
                    return
                  }

                  setInputMode('voice')
                }}
                disabled={voiceToggleDisabled}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-line-glass bg-surface-tertiary/55 px-3 text-sm text-content-secondary transition-colors hover:bg-surface-tertiary/75 hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-50"
                title={inputMode === 'voice' ? '切换到键盘输入' : '切换到语音输入'}
                aria-label={inputMode === 'voice' ? '切换到键盘输入' : '切换到语音输入'}
              >
                {inputMode === 'voice' ? (
                  <>
                    <Keyboard className="h-4 w-4" />
                    <span className="hidden sm:inline">键盘</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    <span className="hidden sm:inline">语音</span>
                  </>
                )}
              </button>
              {sending && !workflowFollowupMode && (
                <button
                  type="button"
                  onClick={handleInterruptAndSend}
                  disabled={!input.trim() || !canUseChatActions}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-ui-warning/35 bg-ui-warning-light px-3 text-sm font-medium text-ui-warning-text transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-ui-warning/12"
                >
                  中断
                </button>
              )}

              <button
                type="button"
                onClick={
                  workflowFollowupMode
                    ? handleWorkflowFollowupSend
                    : sending
                      ? handleQueueSend
                      : handleSend
                }
                disabled={!input.trim() || !canUseChatActions || (!sending && chatQueue.length > 0)}
                className="ml-auto h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-accent-primary px-4 text-sm font-medium text-white shadow-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent-primary/90"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {workflowFollowupMode ? '继续生成' : sending ? '加入队列' : '发送'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div
        className={`fixed inset-0 z-[400] min-[760px]:hidden ${
          mobileSessionsOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!mobileSessionsOpen}
      >
        <div
          className={`absolute inset-0 bg-black/38 transition-opacity duration-300 ${
            mobileSessionsOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMobileSessionsOpen(false)}
        />
        <div
          className={`absolute inset-y-0 left-0 flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden bg-surface-primary/96 p-4 backdrop-blur-xl transition-transform duration-300 ease-out ${
            mobileSessionsOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-line-glass/60 pb-4 pt-2">
            <div>
              <p className="text-sm font-semibold text-content-primary">历史会话</p>
              <p className="mt-1 text-xs text-content-secondary">切换会话、继续之前的上下文。</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileSessionsOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-line-glass bg-surface-glass/70 text-content-secondary transition-colors hover:text-content-primary"
              aria-label="关闭历史会话"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-full min-h-0 flex-1 overflow-hidden">
            {sessionPanel}
          </div>
        </div>
      </div>

    </main>
  )
}
