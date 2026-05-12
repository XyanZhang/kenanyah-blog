import type { Block, BlockNoteEditor, PartialBlock } from '@blocknote/core'
import {
  FormattingToolbar,
  SuggestionMenuController,
  type DefaultReactSuggestionItem,
  type FormattingToolbarProps,
  getFormattingToolbarItems,
  getDefaultReactSlashMenuItems,
  useBlockNoteEditor,
  useComponentsContext,
} from '@blocknote/react'
import { FileText, Loader2, PenLine, Sparkles } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { useState } from 'react'
import { generateAiBlock, type AiBlockAction } from '../lib/ai-api'

type EditorInstance = BlockNoteEditor<any, any, any>

type AiToolbarState =
  | { status: 'idle' }
  | { status: 'loading'; action: AiBlockAction }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

type AiToolbarAction = {
  id: AiBlockAction
  label: string
  tooltip: string
  icon: ReactNode
}

const aiToolbarActions: AiToolbarAction[] = [
  {
    id: 'continue',
    label: '续写',
    tooltip: 'AI 续写当前块',
    icon: <Sparkles size={14} />,
  },
  {
    id: 'rewrite',
    label: '改写',
    tooltip: 'AI 改写当前块',
    icon: <PenLine size={14} />,
  },
  {
    id: 'summarize',
    label: '摘要',
    tooltip: 'AI 总结当前块',
    icon: <FileText size={14} />,
  },
]

export function AiFormattingToolbar(props: FormattingToolbarProps) {
  const [state, setState] = useState<AiToolbarState>({ status: 'idle' })

  return (
    <FormattingToolbar {...props}>
      {getFormattingToolbarItems(props.blockTypeSelectItems)}
      <span className="ai-toolbar-divider" aria-hidden="true" />
      <span className="ai-toolbar-group" role="group" aria-label="AI 文档工具">
        <span className="ai-toolbar-group-label">AI</span>
        {aiToolbarActions.map((action) => (
          <AiToolbarButton
            action={action}
            key={action.id}
            state={state}
            onStateChange={setState}
          />
        ))}
      </span>
      <AiToolbarStatus state={state} />
    </FormattingToolbar>
  )
}

export function AiSlashMenu() {
  const editor = useBlockNoteEditor()

  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) => getAiSlashMenuItems(editor, query)}
    />
  )
}

function AiToolbarButton({
  action,
  state,
  onStateChange,
}: {
  action: AiToolbarAction
  state: AiToolbarState
  onStateChange: (state: AiToolbarState) => void
}) {
  const editor = useBlockNoteEditor()
  const Components = useComponentsContext()
  const isLoading = state.status === 'loading'
  const isCurrentLoading = isLoading && state.action === action.id

  if (!Components) return null

  return (
    <Components.FormattingToolbar.Button
      className={`bn-button ai-toolbar-button ${isCurrentLoading ? 'loading' : ''}`}
      isDisabled={isLoading}
      label={action.label}
      mainTooltip={action.tooltip}
      secondaryTooltip="结果会插入到当前块下方"
      onClick={() => {
        void runAiToolbarAction(editor, action.id, onStateChange)
      }}
    >
      <span className="ai-toolbar-button-content">
        {isCurrentLoading ? <Loader2 className="ai-toolbar-spinner" size={14} /> : action.icon}
        <span className="ai-toolbar-button-label">{action.label}</span>
      </span>
    </Components.FormattingToolbar.Button>
  )
}

function AiToolbarStatus({ state }: { state: AiToolbarState }) {
  if (state.status === 'idle') return null

  if (state.status === 'loading') {
    return (
      <span className="ai-toolbar-status loading">
        <Loader2 className="ai-toolbar-spinner" size={12} />
        {getActionLabel(state.action)}中
      </span>
    )
  }

  return <span className={`ai-toolbar-status ${state.status}`}>{state.message}</span>
}

async function runAiToolbarAction(
  editor: EditorInstance,
  action: AiBlockAction,
  setState: (state: AiToolbarState) => void
) {
  setState({ status: 'loading', action })

  try {
    const sourceBlock = editor.getTextCursorPosition().block
    const sourceText = await getBlockPromptText(editor, sourceBlock)
    if (!sourceText) {
      setState({ status: 'error', message: '当前块没有可处理内容' })
      return
    }

    const markdown = await generateAiBlock(action, sourceText)
    const blocks = await markdownToInsertableBlocks(editor, markdown)
    const insertedBlocks = editor.insertBlocks(blocks, sourceBlock, 'after')
    if (insertedBlocks[0]) {
      editor.setTextCursorPosition(insertedBlocks[0], 'end')
    }

    setState({ status: 'success', message: getActionSuccessMessage(action) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 生成失败'
    setState({ status: 'error', message })
  }
}

async function getAiSlashMenuItems(
  editor: EditorInstance,
  query: string
): Promise<DefaultReactSuggestionItem[]> {
  const defaultItems = getDefaultReactSlashMenuItems(editor)
  const aiItems = aiToolbarActions.map((action) => createAiSlashMenuItem(editor, action))
  return filterSlashMenuItems([...aiItems, ...defaultItems], query)
}

function createAiSlashMenuItem(
  editor: EditorInstance,
  action: AiToolbarAction
): DefaultReactSuggestionItem {
  return {
    title: `AI ${action.label}`,
    subtext: `${action.tooltip}，结果插入到当前块下方`,
    aliases: ['ai', 'AI', action.label, action.id],
    group: 'AI',
    icon: action.icon as ReactElement,
    onItemClick: () => {
      void runAiToolbarAction(editor, action.id, () => undefined)
    },
  }
}

function filterSlashMenuItems(
  items: DefaultReactSuggestionItem[],
  query: string
): DefaultReactSuggestionItem[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return items

  return items.filter((item) => {
    const searchable = [item.title, item.subtext, ...(item.aliases ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return searchable.includes(normalizedQuery)
  })
}

async function getBlockPromptText(editor: EditorInstance, block: Block<any, any, any>): Promise<string> {
  const markdown = await Promise.resolve(editor.blocksToMarkdownLossy([block]))
  return markdown.trim() || inlineContentToText(block.content)
}

async function markdownToInsertableBlocks(
  editor: EditorInstance,
  markdown: string
): Promise<PartialBlock<any, any, any>[]> {
  const blocks = await Promise.resolve(editor.tryParseMarkdownToBlocks(markdown))
  if (blocks.length > 0) return blocks

  return [{ type: 'paragraph', content: markdown }]
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

function getActionLabel(action: AiBlockAction): string {
  if (action === 'rewrite') return '改写'
  if (action === 'summarize') return '总结'
  return '续写'
}

function getActionSuccessMessage(action: AiBlockAction): string {
  if (action === 'rewrite') return '已插入改写'
  if (action === 'summarize') return '已插入摘要'
  return '已插入续写'
}
