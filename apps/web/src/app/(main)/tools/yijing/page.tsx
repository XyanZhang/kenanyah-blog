import type { Metadata } from 'next'
import { YijingWorkbench } from './YijingWorkbench'

export const metadata: Metadata = {
  title: '易经学习',
}

export default function YijingToolPage() {
  return <YijingWorkbench />
}
