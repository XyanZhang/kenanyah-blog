import type { Metadata } from 'next'
import { KnowledgeWorkbench } from './KnowledgeWorkbench'

export const metadata: Metadata = {
  title: '知识库管理',
}

export default function KnowledgeToolPage() {
  return <KnowledgeWorkbench />
}
