import type { Metadata } from 'next'
import type { PhotoEntryDto } from '@blog/types'
import { getApiFetchUrl } from '@/lib/api-client'
import Picture3DGalleryClient from '@/components/pictures/Picture3DGalleryClient'

export const metadata: Metadata = {
  title: '3D Gallery - Works',
}

export const revalidate = 60

type PicturesApiResponse = {
  success?: boolean
  data?: Array<{ id: string; src: string; date: string }>
}

type PhotoEntriesApiResponse = {
  success?: boolean
  data?: PhotoEntryDto[]
}

type GalleryImage = {
  id: string
  src: string
  date: string
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function loadStaticGalleryImages(): Promise<GalleryImage[]> {
  const url = `${getApiFetchUrl('/pictures')}?subdir=seed`
  const json = await fetchJson<PicturesApiResponse>(url)
  if (!json?.success || !Array.isArray(json.data)) {
    return []
  }

  return json.data
}

async function loadDatabaseGalleryImages(): Promise<GalleryImage[]> {
  const json = await fetchJson<PhotoEntriesApiResponse>(getApiFetchUrl('/pictures/entries'))
  if (!json?.success || !Array.isArray(json.data)) {
    return []
  }

  return json.data
    .map((item) => {
      const src =
        item.mediaAsset?.variants?.medium?.url ??
        item.mediaAsset?.url ??
        item.imageUrl

      if (!src) return null

      return {
        id: `db-${item.id}`,
        src,
        date: (item.takenAt ?? item.createdAt).slice(0, 10),
      }
    })
    .filter((item): item is GalleryImage => Boolean(item))
}

async function loadGalleryImages() {
  const [staticItems, databaseItems] = await Promise.all([
    loadStaticGalleryImages(),
    loadDatabaseGalleryImages(),
  ])

  return [...databaseItems, ...staticItems].slice(0, 12)
}

export default async function Pictures3DPage() {
  const images = await loadGalleryImages()

  // Add titles to images
  const galleryImages = images.map((img, i) => ({
    ...img,
    title: `Frame ${String(i + 1).padStart(2, '0')}`,
  }))

  return <Picture3DGalleryClient images={galleryImages} />
}
