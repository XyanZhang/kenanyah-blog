import type { Metadata } from 'next'
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
  data?: Array<{ id: string; imageUrl?: string; takenAt?: string; createdAt: string }>
}

async function loadGalleryImages() {
  const [staticRes, dbRes] = await Promise.all([
    fetch(`${getApiFetchUrl('/pictures')}?subdir=seed`, { next: { revalidate: 60 } }),
    fetch(getApiFetchUrl('/pictures/entries'), { next: { revalidate: 60 } }),
  ])

  const items: Array<{ id: string; src: string; date: string }> = []

  if (staticRes.ok) {
    const json = (await staticRes.json()) as PicturesApiResponse
    if (json.success && Array.isArray(json.data)) {
      items.push(...json.data)
    }
  }

  if (dbRes.ok) {
    const json = (await dbRes.json()) as PhotoEntriesApiResponse
    if (json.success && Array.isArray(json.data)) {
      items.push(
        ...json.data
          .filter((item) => Boolean(item.imageUrl))
          .map((item) => ({
            id: `db-${item.id}`,
            src: item.imageUrl!,
            date: (item.takenAt ?? item.createdAt).slice(0, 10),
          }))
      )
    }
  }

  return items.slice(0, 20) // Limit for performance
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