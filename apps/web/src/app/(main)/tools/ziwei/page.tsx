import type { Metadata } from 'next'
import { ZiweiWorkbench } from './ZiweiWorkbench'

export const metadata: Metadata = {
  title: '紫微斗数学习',
}

export default function ZiweiToolPage() {
  return <ZiweiWorkbench />
}
