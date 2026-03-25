import type { Metadata } from 'next'
import { PictureStack, type PictureStackItem } from '@/components/pictures'
import { getApiFetchUrl } from '@/lib/api-client'

export const metadata: Metadata = {
  title: '图片',
}

/** 相册列表由 API 扫描 statics，Web 不读本地磁盘 */
export const revalidate = 60

type PicturesApiResponse = {
  success?: boolean
  data?: PictureStackItem[]
}

async function loadPictureItems(): Promise<PictureStackItem[]> {
  const url = `${getApiFetchUrl('/pictures')}?subdir=seed`
  try {
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const json = (await res.json()) as PicturesApiResponse
    if (!json.success || !Array.isArray(json.data)) return []
    return json.data
  } catch {
    return []
  }
}

export default async function PicturesPage() {
  const items = await loadPictureItems()

  return (
    <main className="h-[calc(100vh-6.25rem)] w-full flex flex-col">
      <div className="flex-1 flex flex-col min-h-0 w-full">
        <div className="flex-1 min-h-0 min-w-0">
          <PictureStack items={items} className="h-full" />
        </div>
      </div>
    </main>
  )
}
