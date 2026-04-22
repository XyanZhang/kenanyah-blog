'use client'

import dynamic from 'next/dynamic'

const Picture3DGallery = dynamic(
  () => import('@/components/pictures/Picture3DGallery'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(223,174,108,0.18),transparent_24%),radial-gradient(circle_at_78%_22%,rgba(98,126,160,0.12),transparent_20%),linear-gradient(180deg,#3a2b1d_0%,#18120f_38%,#0f0c0a_100%)]">
        <div className="flex flex-col items-center gap-4 rounded-[1.75rem] border border-white/10 bg-black/26 px-8 py-7 backdrop-blur-md">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#d1b187]/25 border-t-[#d8b27f]" />
          <div className="text-center">
            <p
              className="text-[1.55rem] leading-none tracking-[-0.05em] text-[#fff4e3]"
              style={{ fontFamily: 'var(--pictures-font-serif), Georgia, serif' }}
            >
              正在布展
            </p>
            <p className="mt-2 text-sm text-[#eadfcd]/72">Preparing the gallery</p>
          </div>
        </div>
      </div>
    ),
  }
)

interface Picture3DGalleryClientProps {
  images: Array<{ id: string; src: string; date: string; title: string }>
}

export default function Picture3DGalleryClient({ images }: Picture3DGalleryClientProps) {
  return <Picture3DGallery images={images} />
}
