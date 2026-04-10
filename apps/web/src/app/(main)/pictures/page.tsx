import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
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

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-pictures-serif',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-pictures-sans',
  display: 'swap',
})

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
    <main
      className={`${cormorant.variable} ${manrope.variable} min-h-screen w-full`}
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
