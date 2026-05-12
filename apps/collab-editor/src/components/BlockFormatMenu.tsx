import type { Block, BlockNoteEditor } from '@blocknote/core'
import { SideMenuExtension } from '@blocknote/core/extensions'
import {
  BlockColorsItem,
  RemoveBlockItem,
  TableColumnHeaderItem,
  TableRowHeaderItem,
  useBlockNoteEditor,
  useComponentsContext,
  useExtensionState,
} from '@blocknote/react'
import {
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Type,
} from 'lucide-react'
import type { ReactNode } from 'react'

type EditorInstance = BlockNoteEditor<any, any, any>

type BlockFormatAction = {
  id: string
  label: string
  icon: ReactNode
  update: Record<string, unknown>
  isActive: (block: Block<any, any, any>) => boolean
}

const blockFormatActions: BlockFormatAction[] = [
  {
    id: 'paragraph',
    label: '段落',
    icon: <Pilcrow size={16} />,
    update: { type: 'paragraph' },
    isActive: (block) => block.type === 'paragraph',
  },
  {
    id: 'heading-1',
    label: '一级标题',
    icon: <Heading1 size={16} />,
    update: { type: 'heading', props: { level: 1 } },
    isActive: (block) => block.type === 'heading' && block.props.level === 1,
  },
  {
    id: 'heading-2',
    label: '二级标题',
    icon: <Heading2 size={16} />,
    update: { type: 'heading', props: { level: 2 } },
    isActive: (block) => block.type === 'heading' && block.props.level === 2,
  },
  {
    id: 'heading-3',
    label: '三级标题',
    icon: <Heading3 size={16} />,
    update: { type: 'heading', props: { level: 3 } },
    isActive: (block) => block.type === 'heading' && block.props.level === 3,
  },
  {
    id: 'quote',
    label: '引用',
    icon: <Quote size={16} />,
    update: { type: 'quote' },
    isActive: (block) => block.type === 'quote',
  },
  {
    id: 'bullet-list',
    label: '无序列表',
    icon: <List size={16} />,
    update: { type: 'bulletListItem' },
    isActive: (block) => block.type === 'bulletListItem',
  },
  {
    id: 'numbered-list',
    label: '有序列表',
    icon: <ListOrdered size={16} />,
    update: { type: 'numberedListItem' },
    isActive: (block) => block.type === 'numberedListItem',
  },
  {
    id: 'check-list',
    label: '待办',
    icon: <CheckSquare size={16} />,
    update: { type: 'checkListItem', props: { checked: false } },
    isActive: (block) => block.type === 'checkListItem',
  },
  {
    id: 'code',
    label: '代码块',
    icon: <Code2 size={16} />,
    update: { type: 'codeBlock' },
    isActive: (block) => block.type === 'codeBlock',
  },
]

export function BlockFormatMenu() {
  const Components = useComponentsContext()
  const editor = useBlockNoteEditor<any, any, any>()
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  })

  if (!Components || !block) return null

  return (
    <Components.Generic.Menu.Dropdown className="bn-menu-dropdown bn-drag-handle-menu">
      <BlockTypeSubmenu block={block} editor={editor} />
      <Components.Generic.Menu.Divider className="block-format-menu-divider" />
      <RemoveBlockItem>删除</RemoveBlockItem>
      <BlockColorsItem>颜色</BlockColorsItem>
      <TableRowHeaderItem>表头行</TableRowHeaderItem>
      <TableColumnHeaderItem>表头列</TableColumnHeaderItem>
    </Components.Generic.Menu.Dropdown>
  )
}

function BlockTypeSubmenu({
  block,
  editor,
}: {
  block: Block<any, any, any>
  editor: EditorInstance
}) {
  const Components = useComponentsContext()
  if (!Components || !canChangeBlockType(block)) return null

  return (
    <Components.Generic.Menu.Root position="right" sub>
      <Components.Generic.Menu.Trigger sub>
        <Components.Generic.Menu.Item
          className="bn-menu-item"
          icon={<Type size={16} />}
          subTrigger
        >
          转换为
        </Components.Generic.Menu.Item>
      </Components.Generic.Menu.Trigger>
      <Components.Generic.Menu.Dropdown
        className="bn-menu-dropdown block-format-submenu"
        sub
      >
        {blockFormatActions.map((action) => (
          <Components.Generic.Menu.Item
            checked={action.isActive(block)}
            className="bn-menu-item"
            icon={action.icon}
            key={action.id}
            onClick={() => updateBlockFormat(editor, block, action)}
          >
            {action.label}
          </Components.Generic.Menu.Item>
        ))}
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  )
}

function canChangeBlockType(block: Block<any, any, any>): boolean {
  return Array.isArray(block.content)
}

function updateBlockFormat(
  editor: EditorInstance,
  block: Block<any, any, any>,
  action: BlockFormatAction
) {
  editor.updateBlock(block, action.update as any)
  editor.setTextCursorPosition(block.id, 'end')
}
