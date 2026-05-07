import type { Metadata } from 'next'
import { DivinationWorkbench } from './DivinationWorkbench'

export const metadata: Metadata = {
  title: '命理知识库',
}

export default function DivinationToolPage() {
  return <DivinationWorkbench />
}
