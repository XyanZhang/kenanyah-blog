import type { Metadata } from 'next'
import { PictureStack, type PictureStackItem } from '@/components/pictures'

export const metadata: Metadata = {
  title: '图片',
}

const mockPictures: PictureStackItem[] = [
  { id: '1', src: 'https://picsum.photos/seed/p1/440/360', date: '2026-02-25' },
  { id: '2', src: 'https://picsum.photos/seed/p2/440/360', date: '2026-02-22' },
  { id: '3', src: 'https://picsum.photos/seed/p3/440/360', date: '2026-02-18' },
  { id: '4', src: 'https://picsum.photos/seed/p4/440/360', date: '2026-02-12' },
  { id: '5', src: 'https://picsum.photos/seed/p5/440/360', date: '2026-02-08' },
  { id: '6', src: 'https://picsum.photos/seed/p6/440/360', date: '2026-02-01' },
  { id: '7', src: 'https://picsum.photos/seed/p7/440/360', date: '2026-01-25' },
  { id: '8', src: 'https://picsum.photos/seed/p8/440/360', date: '2026-01-18' },
]

export default function PicturesPage() {
  return (
    <main className="h-[calc(100vh-80px)] w-full flex flex-col">
      <div className="flex-1 flex flex-col min-h-0 w-full">
        <div className="flex-1 min-h-0 min-w-0">
          <PictureStack items={mockPictures} className="h-full" />
        </div>
      </div>
    </main>
  )
}
