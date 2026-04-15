import type { Metadata } from 'next'
import { ToolsPageClient } from './ToolsPageClient'

export const metadata: Metadata = {
  title: '工具',
}

export default function ToolsPage() {
  return <ToolsPageClient />
}
