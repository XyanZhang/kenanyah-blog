'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpenText,
  Check,
  Clipboard,
  DatabaseZap,
  Layers3,
  MessageSquareText,
  Plus,
  Search,
  UploadCloud,
} from 'lucide-react'
import { toast } from 'sonner'

type SourceStatus = 'ready' | 'queued' | 'draft'
type QuestionType = 'career' | 'relationship' | 'wealth' | 'health' | 'travel' | 'general'
type ReadingMode = 'daily' | 'bazi' | 'name' | 'event'

type KnowledgeSource = {
  id: string
  title: string
  author: string
  category: string
  status: SourceStatus
  notes: string
  tags: string[]
  chunks: number
}

const statusCopy: Record<SourceStatus, { label: string; tone: string }> = {
  ready: { label: '可引用 Ready', tone: 'border-ui-success/60 bg-ui-success text-ui-success-text' },
  queued: { label: '待入库 Queued', tone: 'border-ui-warning/40 bg-ui-warning-light text-ui-warning-text' },
  draft: { label: '整理中 Draft', tone: 'border-line-primary bg-surface-tertiary text-content-secondary' },
}

const questionTypes: Array<{ value: QuestionType; label: string }> = [
  { value: 'career', label: '事业 Career' },
  { value: 'relationship', label: '情感 Love' },
  { value: 'wealth', label: '财运 Wealth' },
  { value: 'health', label: '健康 Health' },
  { value: 'travel', label: '出行 Travel' },
  { value: 'general', label: '综合 General' },
]

const readingModes: Array<{ value: ReadingMode; label: string; short: string }> = [
  { value: 'daily', label: '通书择日', short: 'Almanac' },
  { value: 'bazi', label: '八字参考', short: 'BaZi' },
  { value: 'name', label: '姓名灵感', short: 'Naming' },
  { value: 'event', label: '事项占断', short: 'Event' },
]

const initialSources: KnowledgeSource[] = [
  {
    id: 'michong-long-calendar',
    title: '米虫合成长历通书',
    author: '米虫资料整理',
    category: '通书 / 择日',
    status: 'queued',
    notes: '作为每日宜忌、节气、冲煞和民俗判断的核心参考资料，适合做日期维度的结构化索引。',
    tags: ['择日', '通书', '宜忌'],
    chunks: 0,
  },
  {
    id: 'sanming-tonghui',
    title: '三命通会',
    author: '万民英',
    category: '八字 / 命理',
    status: 'draft',
    notes: '适合拆成格局、十神、神煞、岁运等主题索引，回答时需要明确引用章节或条目。',
    tags: ['八字', '格局', '古籍'],
    chunks: 0,
  },
  {
    id: 'qiongtong-baojian',
    title: '穷通宝鉴',
    author: '余春台辑',
    category: '八字 / 调候',
    status: 'draft',
    notes: '适合按日主、月令和调候关键词检索，用于补充季节、寒暖燥湿等判断维度。',
    tags: ['调候', '日主', '月令'],
    chunks: 0,
  },
  {
    id: 'calendar-almanac-demo',
    title: '万年历基础资料',
    author: '系统资料',
    category: '日期 / 农历',
    status: 'ready',
    notes: '当前已能提供农历、节气、节日、宜忌和冲煞等日期信息，可先作为日期参考层。',
    tags: ['农历', '节气', '冲煞'],
    chunks: 365,
  },
]

function buildPrompt(input: {
  mode: ReadingMode
  questionType: QuestionType
  question: string
  birthInfo: string
  targetDate: string
  selectedSources: KnowledgeSource[]
}) {
  const mode = readingModes.find((item) => item.value === input.mode)
  const questionType = questionTypes.find((item) => item.value === input.questionType)
  const sources = input.selectedSources.map((source) => `- ${source.title}：${source.category}`).join('\n')

  return [
    `你是谨慎的命理文化资料助手。模式：${mode?.label ?? '命理参考'} / ${mode?.short ?? 'Reading'}。`,
    '请基于已选知识库做文化参考式分析，不要把结论说成绝对事实。',
    '回答结构：核心判断、依据摘录、可执行建议、需要补充的信息、风险提醒。',
    '',
    `问题类型：${questionType?.label ?? '综合 General'}`,
    `目标日期：${input.targetDate || '未指定'}`,
    `出生/背景信息：${input.birthInfo || '未填写'}`,
    `用户问题：${input.question || '未填写'}`,
    '',
    '优先参考资料：',
    sources || '- 暂未选择资料',
  ].join('\n')
}

function splitTags(value: string) {
  return value
    .split(/[，,、\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5)
}

function MetricItem(props: { label: string; value: number | string; hint: string }) {
  return (
    <div className="min-w-0 border-t border-line-primary pt-3">
      <div className="text-[1.6rem] font-semibold leading-none tracking-[0] text-content-primary">{props.value}</div>
      <div className="mt-1 text-xs font-medium text-content-muted">{props.label}</div>
      <div className="mt-1 truncate text-xs text-content-dim">{props.hint}</div>
    </div>
  )
}

function SourceRow(props: {
  source: KnowledgeSource
  active: boolean
  selected: boolean
  onOpen: () => void
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={props.onOpen}
      className={`grid w-full cursor-pointer grid-cols-[1fr_auto] gap-3 rounded-lg border px-3 py-3 text-left transition ${
        props.active
          ? 'border-ui-primary bg-ui-primary text-content-inverse shadow-sm'
          : 'border-line-primary bg-surface-primary text-content-primary hover:border-line-hover hover:bg-surface-hover'
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary-ring`}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold tracking-[0]">{props.source.title}</span>
        <span className={`mt-1 block truncate text-xs ${props.active ? 'text-content-inverse/75' : 'text-content-muted'}`}>
          {props.source.category}
        </span>
      </span>
      <span
        role="checkbox"
        aria-checked={props.selected}
        tabIndex={0}
        onClick={(event) => {
          event.stopPropagation()
          props.onToggle()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            event.stopPropagation()
            props.onToggle()
          }
        }}
        className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border transition ${
          props.selected
            ? 'border-ui-success-text bg-ui-success-text text-content-inverse'
            : props.active
              ? 'border-content-inverse/35 bg-ui-primary-hover text-content-inverse/70'
              : 'border-line-primary bg-surface-primary text-content-muted'
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary-ring`}
      >
        {props.selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </span>
    </button>
  )
}

export function DivinationWorkbench() {
  const [sources, setSources] = useState(initialSources)
  const [activeSourceId, setActiveSourceId] = useState(initialSources[0]?.id ?? '')
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(['michong-long-calendar', 'calendar-almanac-demo'])
  const [questionType, setQuestionType] = useState<QuestionType>('career')
  const [readingMode, setReadingMode] = useState<ReadingMode>('daily')
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [birthInfo, setBirthInfo] = useState('1995-08-16 08:30，女，成都')
  const [question, setQuestion] = useState('最近想调整工作节奏，适合把重要沟通安排在哪天？')
  const [newSourceTitle, setNewSourceTitle] = useState('')
  const [newSourceTags, setNewSourceTags] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)

  const activeSource = sources.find((source) => source.id === activeSourceId) ?? sources[0]
  const selectedSources = sources.filter((source) => selectedSourceIds.includes(source.id))
  const readyCount = sources.filter((source) => source.status === 'ready').length
  const chunkCount = sources.reduce((sum, source) => sum + source.chunks, 0)
  const prompt = useMemo(
    () =>
      buildPrompt({
        mode: readingMode,
        questionType,
        question,
        birthInfo,
        targetDate,
        selectedSources,
      }),
    [birthInfo, question, questionType, readingMode, selectedSources, targetDate]
  )
  const aiReplyPreview = useMemo(() => {
    const sourceNames = selectedSources.map((source) => source.title).join('、') || '未选择资料'
    return [
      '这里会展示 AI 根据知识库生成的回复。',
      '',
      `本次将参考：${sourceNames}`,
      `当前问题：${question || '未填写'}`,
      '',
      '后续接入后端 RAG 后，这里会显示：核心判断、依据摘录、行动建议和风险提醒。',
    ].join('\n')
  }, [question, selectedSources])

  const addSource = () => {
    const title = newSourceTitle.trim()
    if (!title) {
      toast.error('请先填写书名或资料名')
      return
    }

    const source: KnowledgeSource = {
      id: `source-${Date.now()}`,
      title,
      author: '待补充',
      category: '自定义资料',
      status: 'queued',
      notes: '等待上传原文、OCR 或 Markdown 后进入切分和向量化流程。',
      tags: splitTags(newSourceTags),
      chunks: 0,
    }

    setSources((current) => [source, ...current])
    setActiveSourceId(source.id)
    setSelectedSourceIds((current) => [source.id, ...current])
    setNewSourceTitle('')
    setNewSourceTags('')
    toast.success('已加入资料清单')
  }

  const toggleSourceSelection = (sourceId: string) => {
    setSelectedSourceIds((current) =>
      current.includes(sourceId) ? current.filter((id) => id !== sourceId) : [...current, sourceId]
    )
  }

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt)
    toast.success('提示词已复制')
  }

  return (
    <main className="h-screen overflow-hidden bg-bg-base px-3 py-3 text-content-primary sm:px-5 lg:pr-8">
      <div className="mx-auto grid h-full max-w-[1500px] min-h-0 gap-3 lg:grid-cols-[300px_minmax(0,1fr)_420px]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line-primary bg-surface-primary p-3 shadow-[0_16px_40px_var(--theme-shadow-color)]">
          <div className="shrink-0">
            <div className="flex items-center justify-between gap-3 px-1 py-1">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-muted">Library</p>
                <h1 className="mt-1 text-xl font-semibold tracking-[0] text-content-primary">命理资料库</h1>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-line-primary bg-surface-primary text-content-secondary transition hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary-ring"
                aria-label="上传资料"
              >
                <UploadCloud className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid shrink-0 grid-cols-3 gap-3">
            <MetricItem label="Sources" value={sources.length} hint={`${readyCount} ready`} />
            <MetricItem label="Selected" value={selectedSources.length} hint="for AI" />
            <MetricItem label="Chunks" value={chunkCount} hint="indexed" />
          </div>

          <div className="mt-5 flex shrink-0 items-center gap-2 rounded-md border border-line-primary bg-surface-primary px-3 py-2 text-content-muted">
            <Search className="h-4 w-4" />
            <span className="text-sm">搜索资料 / Search</span>
          </div>

          <div className="mt-3 grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
            {sources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                active={activeSource?.id === source.id}
                selected={selectedSourceIds.includes(source.id)}
                onOpen={() => setActiveSourceId(source.id)}
                onToggle={() => toggleSourceSelection(source.id)}
              />
            ))}
          </div>

          <div className="mt-4 shrink-0 border-t border-line-primary pt-4">
            <p className="text-sm font-semibold tracking-[0] text-content-primary">添加资料 / Add Source</p>
            <div className="mt-3 grid gap-2">
              <input
                value={newSourceTitle}
                onChange={(event) => setNewSourceTitle(event.target.value)}
                placeholder="滴天髓阐微"
                className="h-10 rounded-md border border-line-primary bg-surface-primary px-3 text-sm text-content-primary outline-none transition placeholder:text-content-dim focus:border-line-focus focus:ring-2 focus:ring-ui-primary-ring"
              />
              <input
                value={newSourceTags}
                onChange={(event) => setNewSourceTags(event.target.value)}
                placeholder="八字、格局、用神"
                className="h-10 rounded-md border border-line-primary bg-surface-primary px-3 text-sm text-content-primary outline-none transition placeholder:text-content-dim focus:border-line-focus focus:ring-2 focus:ring-ui-primary-ring"
              />
              <button
                type="button"
                onClick={addSource}
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-ui-primary px-3 text-sm font-semibold text-content-inverse transition hover:bg-ui-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary-ring"
              >
                <Plus className="h-4 w-4" />
                加入清单
              </button>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-line-primary bg-surface-primary shadow-[0_16px_40px_var(--theme-shadow-color)]">
          <header className="shrink-0 border-b border-line-primary p-5 md:p-6">
            <div className="grid gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-md border border-line-primary bg-surface-primary px-2.5 py-1 text-xs font-semibold text-content-secondary">
                    <DatabaseZap className="h-3.5 w-3.5" />
                    Knowledge Workbench
                  </span>
                  <span className="rounded-md bg-accent-primary-subtle px-2.5 py-1 text-xs font-semibold text-accent-primary-dark">
                    文化参考 Cultural reference
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  <div>
                    <h2 className="whitespace-nowrap text-2xl font-semibold leading-tight tracking-[0] text-content-primary md:text-3xl">
                      命理知识库工作台
                    </h2>
                    <p className="mt-2 max-w-[72ch] text-sm leading-6 text-content-secondary">
                      先把资料整理成可追溯的引用层，再让 AI 做文化参考式解读。
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      ['01', '整理'],
                      ['02', '切分'],
                      ['03', '引用'],
                    ].map(([step, label]) => (
                      <span key={step} className="inline-flex items-center gap-2 rounded-md border border-line-primary bg-surface-primary px-2.5 py-1.5 text-xs font-semibold text-content-secondary">
                        <span className="text-content-dim">{step}</span>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid gap-2 rounded-lg border border-line-primary bg-surface-secondary p-2 sm:grid-cols-3">
                {[
                  ['当前资料', activeSource?.category ?? '未选择'],
                  ['引用数', `${selectedSources.length}`],
                  ['片段数', `${activeSource?.chunks ?? 0}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-surface-primary px-3 py-2">
                    <p className="text-[11px] font-semibold text-content-dim">{label}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-content-primary">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </header>

          {activeSource && (
            <div className="grid min-h-0 flex-1 gap-0 overflow-hidden xl:grid-cols-[minmax(0,1fr)_260px]">
              <article className="min-h-0 min-w-0 overflow-y-auto p-5 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-content-muted">{activeSource.category}</p>
                    <h3 className="mt-2 text-3xl font-semibold leading-tight tracking-[0] text-content-primary md:text-5xl">
                      {activeSource.title}
                    </h3>
                  </div>
                  <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${statusCopy[activeSource.status].tone}`}>
                    {statusCopy[activeSource.status].label}
                  </span>
                </div>

                <p className="mt-6 max-w-[68ch] text-base leading-8 text-content-secondary">
                  {activeSource.notes}
                </p>

                <div className="mt-8 grid gap-4 border-y border-line-primary py-5 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-content-dim">Author</p>
                    <p className="mt-2 text-sm font-semibold text-content-primary">{activeSource.author}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-content-dim">Chunks</p>
                    <p className="mt-2 text-sm font-semibold text-content-primary">{activeSource.chunks}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-content-dim">Tags</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {activeSource.tags.map((tag) => (
                        <span key={tag} className="rounded-md bg-surface-tertiary px-2 py-1 text-xs font-medium text-content-secondary">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-7 rounded-lg border border-line-primary bg-surface-secondary p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-content-primary">后续入库流程</p>
                      <p className="mt-1 text-xs text-content-muted">Upload / OCR → Chunking → RAG citation</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-line-primary bg-surface-primary px-3 text-xs font-semibold text-content-secondary transition hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary-ring"
                    >
                      查看流程
                    </button>
                  </div>
                </div>
              </article>

              <aside className="min-h-0 overflow-y-auto border-t border-line-primary p-5 xl:border-l xl:border-t-0 md:p-7">
                <div className="flex items-center gap-2 text-sm font-semibold text-content-primary">
                  <Layers3 className="h-4 w-4" />
                  本次依据 / Sources
                </div>
                <div className="mt-4 grid gap-2">
                  {selectedSources.map((source) => (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => toggleSourceSelection(source.id)}
                      className="cursor-pointer rounded-md border border-line-primary bg-surface-primary px-3 py-2 text-left text-sm font-medium text-content-secondary transition hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary-ring"
                    >
                      {source.title}
                    </button>
                  ))}
                  {selectedSources.length === 0 && <p className="text-sm text-content-muted">暂无选择 / Empty</p>}
                </div>
              </aside>
            </div>
          )}
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line-primary bg-surface-primary text-content-primary shadow-[0_16px_40px_var(--theme-shadow-color)]">
          <div className="shrink-0 border-b border-line-primary p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-muted">Consult</p>
                <h2 className="mt-1 text-xl font-semibold tracking-[0]">咨询草稿</h2>
              </div>
              <BookOpenText className="h-5 w-5 text-content-secondary" />
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4">
            <div>
              <label className="text-xs font-semibold text-content-secondary">解读模式 / Mode</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {readingModes.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setReadingMode(mode.value)}
                    className={`cursor-pointer rounded-md border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary-ring ${
                      readingMode === mode.value
                        ? 'border-ui-primary bg-ui-primary text-content-inverse'
                        : 'border-line-primary bg-surface-primary text-content-primary hover:bg-surface-hover'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{mode.label}</span>
                    <span className={`mt-1 block text-xs ${readingMode === mode.value ? 'text-content-inverse/75' : 'text-content-muted'}`}>
                      {mode.short}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <label className="grid gap-2 text-xs font-semibold text-content-secondary">
                问题类型 / Type
                <select
                  value={questionType}
                  onChange={(event) => setQuestionType(event.target.value as QuestionType)}
                  className="h-10 rounded-md border border-line-primary bg-surface-primary px-3 text-sm font-medium text-content-primary outline-none focus:border-line-focus focus:ring-2 focus:ring-ui-primary-ring"
                >
                  {questionTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs font-semibold text-content-secondary">
                目标日期 / Date
                <input
                  type="date"
                  value={targetDate}
                  onChange={(event) => setTargetDate(event.target.value)}
                  className="h-10 rounded-md border border-line-primary bg-surface-primary px-3 text-sm font-medium text-content-primary outline-none focus:border-line-focus focus:ring-2 focus:ring-ui-primary-ring"
                />
              </label>
            </div>

            <label className="grid gap-2 text-xs font-semibold text-content-secondary">
              出生 / 背景 Birth / Context
              <input
                value={birthInfo}
                onChange={(event) => setBirthInfo(event.target.value)}
                className="h-10 rounded-md border border-line-primary bg-surface-primary px-3 text-sm font-medium text-content-primary outline-none placeholder:text-content-dim focus:border-line-focus focus:ring-2 focus:ring-ui-primary-ring"
              />
            </label>

            <label className="grid gap-2 text-xs font-semibold text-content-secondary">
              问题 / Question
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={6}
                className="resize-none rounded-md border border-line-primary bg-surface-primary px-3 py-3 text-sm leading-6 text-content-primary outline-none placeholder:text-content-dim focus:border-line-focus focus:ring-2 focus:ring-ui-primary-ring"
              />
            </label>

            <section className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-content-secondary">AI 回复 / Reply</p>
                <span className="rounded-md bg-surface-tertiary px-2 py-1 text-[11px] font-semibold text-content-muted">
                  Preview
                </span>
              </div>
              <div className="min-h-[150px] max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-line-primary bg-surface-primary px-3 py-3 text-sm leading-6 text-content-secondary">
                {aiReplyPreview}
              </div>
            </section>
          </div>

          <div className="shrink-0 border-t border-line-primary p-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowPrompt((value) => !value)}
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-ui-primary px-3 text-sm font-semibold text-content-inverse transition hover:bg-ui-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary-ring"
              >
                <MessageSquareText className="h-4 w-4" />
                {showPrompt ? '收起' : '生成'}
              </button>
              <button
                type="button"
                onClick={copyPrompt}
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-line-primary bg-surface-primary px-3 text-sm font-semibold text-content-secondary transition hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary-ring"
              >
                <Clipboard className="h-4 w-4" />
                复制
              </button>
            </div>
            <AnimatePresence initial={false}>
              {showPrompt && (
                <motion.pre
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.22 }}
                  className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-line-primary bg-surface-secondary p-3 text-xs leading-6 text-content-secondary"
                >
                  {prompt}
                </motion.pre>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </main>
  )
}
