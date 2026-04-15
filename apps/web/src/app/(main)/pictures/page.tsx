import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import type { PhotoEntryDto } from '@blog/types'
import { PictureStack, type PictureStackItem } from '@/components/pictures'
import { getApiFetchUrl } from '@/lib/api-client'
import { cormorantGaramond, manrope } from '@/lib/fonts'

export const metadata: Metadata = {
  title: '图片',
}

/** 相册列表由 API 扫描 statics，Web 不读本地磁盘 */
export const revalidate = 60

type PicturesApiResponse = {
  success?: boolean
  data?: PictureStackItem[]
}

type PhotoEntriesApiResponse = {
  success?: boolean
  data?: PhotoEntryDto[]
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

async function loadDatabasePhotoItems(): Promise<PictureStackItem[]> {
  try {
    const res = await fetch(getApiFetchUrl('/pictures/entries'), { next: { revalidate: 60 } })
    if (!res.ok) return []
    const json = (await res.json()) as PhotoEntriesApiResponse
    if (!json.success || !Array.isArray(json.data)) return []
    return json.data
      .filter((item) => Boolean(item.imageUrl))
      .map((item) => ({
        id: `db-${item.id}`,
        src: item.imageUrl!,
        date: (item.takenAt ?? item.createdAt).slice(0, 10),
      }))
  } catch {
    return []
  }
}

export default async function PicturesPage() {
  const [staticItems, databaseItems] = await Promise.all([
    loadPictureItems(),
    loadDatabasePhotoItems(),
  ])
  const items = [...databaseItems, ...staticItems]

  return (
    <main
      className={`${cormorantGaramond.variable} ${manrope.variable} min-h-screen w-full`}
      style={
        {
          '--pictures-font-serif': 'var(--font-pictures-serif)',
          '--pictures-font-sans': 'var(--font-pictures-sans)',
        } as CSSProperties
      }
    >
      <div
        className="w-full"
        style={{ fontFamily: 'var(--pictures-font-sans), ui-sans-serif, system-ui, sans-serif' }}
      >
        <PictureStack items={items} />
      </div>
    </main>
  )
}
