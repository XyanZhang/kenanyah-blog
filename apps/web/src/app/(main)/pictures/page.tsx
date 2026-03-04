import type { Metadata } from 'next'
import { PictureStack, type PictureStackItem } from '@/components/pictures'

export const metadata: Metadata = {
  title: '图片',
}

/** 粉色花瓣图（项目内资源：仅花瓣，非整朵花） */
const PINK_PETAL_IMAGE = '/images/petal_2.png'

const mockPictures: PictureStackItem[] = [
  { id: 'petal', src: PINK_PETAL_IMAGE, date: '2026-02-26' },
  { id: '1', src: 'https://picsum.photos/seed/p1/440/360', date: '2026-02-25' },
  { id: '2', src: 'https://picsum.photos/seed/p2/440/360', date: '2026-02-22' },
  { id: '3', src: 'https://picsum.photos/seed/p3/440/360', date: '2026-02-18' },
  { id: '4', src: 'https://picsum.photos/seed/p4/440/360', date: '2026-02-12' },
  { id: '5', src: 'https://picsum.photos/seed/p5/440/360', date: '2026-02-08' },
  { id: '6', src: 'https://picsum.photos/seed/p6/440/360', date: '2026-02-01' },
  { id: '7', src: 'https://picsum.photos/seed/p7/440/360', date: '2026-01-25' },
  { id: '8', src: 'https://picsum.photos/seed/p8/440/360', date: '2026-01-18' },
  { id: '9', src: 'https://picsum.photos/seed/p9/440/360', date: '2026-01-12' },
  { id: '10', src: 'https://picsum.photos/seed/p10/440/360', date: '2026-01-05' },
  { id: '11', src: 'https://picsum.photos/seed/p11/440/360', date: '2025-12-28' },
  { id: '12', src: 'https://picsum.photos/seed/p12/440/360', date: '2025-12-20' },
  { id: '13', src: 'https://picsum.photos/seed/p13/440/360', date: '2025-12-14' },
  { id: '14', src: 'https://picsum.photos/seed/p14/440/360', date: '2025-12-08' },
  { id: '15', src: 'https://picsum.photos/seed/p15/440/360', date: '2025-12-01' },
  { id: '16', src: 'https://picsum.photos/seed/p16/440/360', date: '2025-11-24' },
  { id: '17', src: 'https://picsum.photos/seed/p17/440/360', date: '2025-11-18' },
  { id: '18', src: 'https://picsum.photos/seed/p18/440/360', date: '2025-11-10' },
]

export default function PicturesPage() {
  return (
    <main className="h-[calc(100vh-6.25rem)] w-full flex flex-col">
      <div className="flex-1 flex flex-col min-h-0 w-full">
        <div className="flex-1 min-h-0 min-w-0">
          <PictureStack items={mockPictures} className="h-full" />
        </div>
      </div>
    </main>
  )
}
