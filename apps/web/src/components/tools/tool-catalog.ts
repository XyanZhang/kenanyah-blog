import type { Route } from 'next'
import {
  BookOpenText,
  FileText,
  Image as ImageIcon,
  LibraryBig,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

export type ToolCatalogItem = {
  name: string
  description: string
  href: Route
  tags: string[]
  note: string
  icon: LucideIcon
  mode: string
}

export const publicTools: ToolCatalogItem[] = [
  {
    name: 'Image Converter',
    description: '在浏览器中完成图片格式转换、裁剪、圆角处理和导出预览。',
    href: '/projects/image-converter',
    tags: ['Image', 'Canvas', 'Crop'],
    note: '适合快速处理常见图片任务。',
    icon: ImageIcon,
    mode: 'Image Pipeline',
  },
]

export const workspaceTools: ToolCatalogItem[] = [
  {
    name: 'PDF Agent',
    description: '上传 PDF，完成解析、向量化和问答，并导出整理后的 Markdown。',
    href: '/workspace/pdf-agent',
    tags: ['PDF', 'RAG', 'Markdown'],
    note: '适合长文档阅读、整理和提炼。',
    icon: FileText,
    mode: 'Document Parsing',
  },
  {
    name: '统一知识库',
    description: '查看易经、紫微和后续门类的资料源、chunks 与跨 domain 检索状态。',
    href: '/workspace/knowledge',
    tags: ['Knowledge', 'Domain', 'RAG'],
    note: '通用底座入口，适合检查资料是否已经完成索引。',
    icon: LibraryBig,
    mode: 'Knowledge Base',
  },
  {
    name: '易经学习 Agent',
    description: '导入《易经》全文，写入通用知识库后进入专门的学习对话。',
    href: '/workspace/yijing',
    tags: ['I Ching', 'RAG', 'Learning'],
    note: '保留老师体验，底层按 domain=yijing 检索。',
    icon: BookOpenText,
    mode: 'Classics Study',
  },
  {
    name: '紫微斗数老师',
    description: '上传《紫微斗数全书》PDF，写入通用知识库后供紫微斗数老师检索。',
    href: '/workspace/ziwei',
    tags: ['Zi Wei', 'RAG', 'Learning'],
    note: '保留老师体验，底层按 domain=ziwei 检索。',
    icon: Sparkles,
    mode: 'Zi Wei Study',
  },
]
