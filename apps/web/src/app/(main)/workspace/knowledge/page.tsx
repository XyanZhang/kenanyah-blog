import type { Metadata } from 'next'
import { KnowledgeWorkbench } from '../../tools/knowledge/KnowledgeWorkbench'

export const metadata: Metadata = {
  title: '知识库管理',
}

export default function KnowledgeWorkspacePage() {
  return <KnowledgeWorkbench />
}
