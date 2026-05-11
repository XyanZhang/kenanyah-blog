import type { Metadata } from 'next'
import { ZiweiWorkbench } from '../../tools/ziwei/ZiweiWorkbench'

export const metadata: Metadata = {
  title: '紫微斗数学习',
}

export default function ZiweiWorkspacePage() {
  return <ZiweiWorkbench />
}
