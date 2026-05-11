import type { Metadata } from 'next'
import { WorkspacePageClient } from './WorkspacePageClient'

export const metadata: Metadata = {
  title: '个人工作台',
}

export default function WorkspacePage() {
  return <WorkspacePageClient />
}
