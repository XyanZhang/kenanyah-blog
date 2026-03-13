'use client'

import { DashboardCard, ImageCardConfig } from '@blog/types'

interface ImageCardProps {
  card: DashboardCard
}

export function ImageCard({ card }: ImageCardProps) {
  const config = card.config as ImageCardConfig

  const defaultConfig: ImageCardConfig = {
    src: '/images/avatar/avatar-pink.png',
    alt: 'Cover Image',
    objectFit: 'cover',
    showOverlay: false,
  }

  const { src, alt, objectFit, showOverlay, overlayText, linkUrl } = {
    ...defaultConfig,
    ...config,
  }

  const handleImageError = () => {
    console.error('Image failed to load', src)
  }

  const imageContent = (
    <div className="relative h-full w-full overflow-hidden">
      <img
        src={src}
        alt={alt}
        className={`h-full w-full transition-transform duration-300 group-hover:scale-105 object-${objectFit}`}
        style={{ objectFit }}
        loading="lazy"
        onError={handleImageError}
      />
      {showOverlay && (
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-4">
          {overlayText && (
            <p className="text-lg font-semibold text-white drop-shadow-lg">
              {overlayText}
            </p>
          )}
        </div>
      )}
    </div>
  )

  if (linkUrl) {
    return (
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full w-full"
      >
        {imageContent}
      </a>
    )
  }

  return imageContent
}
