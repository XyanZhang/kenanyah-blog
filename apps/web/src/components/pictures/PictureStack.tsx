'use client'

import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { buildPicturesImageUrl, isPicturesSource } from '@/lib/image-service'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'

export interface PictureStackItem {
  id: string
  src: string
  date: string
}

interface PictureStackProps {
  items: PictureStackItem[]
  className?: string
}

const aspectPattern = ['4 / 5', '5 / 7', '1 / 1', '4 / 3', '3 / 4', '5 / 6']

function resolvePictureListSrc(src: string): string {
  if (!isPicturesSource(src)) return src
  return buildPicturesImageUrl(src, {
    width: 1200,
    height: 1600,
    quality: 78,
    fit: 'cover',
    format: 'webp',
  })
}

function resolvePictureDetailSrc(src: string): string {
  if (!isPicturesSource(src)) return src
  return buildPicturesImageUrl(src)
}

function formatDateLabel(date: string): string {
  if (!date) return 'Undated'

  const normalized = date.replace(/\./g, '-').replace(/\//g, '-')
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return date

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsed)
}

function extractYear(date: string): string {
  const match = date.match(/\d{4}/)
  return match?.[0] ?? 'Archive'
}

export function PictureStack({ items, className }: PictureStackProps) {
  const [previewIndex, setPreviewIndex] = useState<number>(-1)

  const sorted = useMemo(
    () => [...items].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0)),
    [items]
  )

  const featuredItem = sorted[0]
  const galleryItems = sorted.slice(1)
  const archiveYears = Array.from(new Set(sorted.map((item) => extractYear(item.date))))
  const latestYear = archiveYears[0] ?? 'Archive'
  const earliestYear = archiveYears[archiveYears.length - 1] ?? latestYear

  const slides = useMemo(
    () =>
      sorted.map((item) => ({
        src: resolvePictureDetailSrc(item.src),
      })),
    [sorted]
  )

  const openPreview = (item: PictureStackItem) => {
    const index = sorted.findIndex((candidate) => candidate.id === item.id)
    if (index >= 0) setPreviewIndex(index)
  }

  return (
    <>
      <section
        className={cn('relative overflow-hidden', className)}
        style={
          {
            '--pictures-bg-soft':
              'color-mix(in srgb, var(--theme-surface-primary) 72%, transparent)',
            '--pictures-bg-muted':
              'color-mix(in srgb, var(--theme-surface-secondary) 82%, transparent)',
            '--pictures-panel':
              'color-mix(in srgb, var(--theme-surface-primary) 76%, var(--theme-accent-primary-light) 24%)',
            '--pictures-panel-soft':
              'color-mix(in srgb, var(--theme-surface-secondary) 78%, var(--theme-accent-primary-subtle) 22%)',
            '--pictures-ink-strong':
              'color-mix(in srgb, var(--theme-text-primary) 96%, var(--theme-accent-primary-dark) 4%)',
            '--pictures-ink':
              'color-mix(in srgb, var(--theme-text-primary) 82%, var(--theme-text-secondary) 18%)',
            '--pictures-muted':
              'color-mix(in srgb, var(--theme-text-muted) 82%, var(--theme-text-secondary) 18%)',
            '--pictures-line':
              'color-mix(in srgb, var(--theme-border-primary) 72%, var(--theme-accent-primary) 28%)',
            '--pictures-line-strong':
              'color-mix(in srgb, var(--theme-border-secondary) 58%, var(--theme-accent-primary) 42%)',
            '--pictures-accent':
              'color-mix(in srgb, var(--theme-accent-primary) 68%, var(--theme-accent-secondary) 32%)',
            '--pictures-shadow': 'var(--theme-shadow-color)',
            '--pictures-shadow-accent': 'var(--theme-shadow-accent)',
            '--pictures-lightbox':
              'color-mix(in srgb, var(--theme-text-primary) 88%, #000 12%)',
          } as CSSProperties
        }
      >
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-20 pt-24 sm:gap-12 sm:px-6 sm:pt-28 lg:px-12 lg:pb-28 lg:pt-24">
          <motion.header
            className="grid gap-6 border-b pb-8 sm:gap-8 sm:pb-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)] lg:items-end"
            style={{ borderColor: 'var(--pictures-line)' }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="max-w-4xl">
              <p className="mb-4 text-[0.7rem] uppercase tracking-[0.38em] text-[var(--pictures-muted)]">
                Curated Picture Archive
              </p>
              <h1
                className="max-w-5xl text-[clamp(3.2rem,10vw,7.4rem)] leading-[0.88] tracking-[-0.06em] text-[var(--pictures-ink-strong)]"
                style={{ fontFamily: 'var(--pictures-font-serif), Georgia, serif' }}
              >
                Pictures
              </h1>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--pictures-ink)] sm:text-base">
                让图片像被安静地陈列，而不是堆在一个组件里。留白、纸感与编目文字，才更适合这批图像的气质。
              </p>
            </div>

            <div className="grid gap-4 text-[var(--pictures-ink)] sm:grid-cols-3 lg:grid-cols-1">
              <div className="border-t pt-3" style={{ borderColor: 'var(--pictures-line-strong)' }}>
                <p className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--pictures-muted)]">
                  Frames
                </p>
                <p className="mt-2 text-2xl tracking-[-0.04em] text-[var(--pictures-ink-strong)]">{sorted.length}</p>
              </div>
              <div className="border-t pt-3" style={{ borderColor: 'var(--pictures-line-strong)' }}>
                <p className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--pictures-muted)]">
                  Span
                </p>
                <p className="mt-2 text-2xl tracking-[-0.04em] text-[var(--pictures-ink-strong)]">
                  {earliestYear}
                  {earliestYear !== latestYear ? ` - ${latestYear}` : ''}
                </p>
              </div>
              <div className="border-t pt-3" style={{ borderColor: 'var(--pictures-line-strong)' }}>
                <p className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--pictures-muted)]">
                  Mode
                </p>
                <p className="mt-2 text-2xl tracking-[-0.04em] text-[var(--pictures-ink-strong)]">Editorial</p>
              </div>
            </div>
          </motion.header>

          {featuredItem ? (
            <motion.section
              className="grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.72fr)] lg:items-start"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={() => openPreview(featuredItem)}
                className="group relative block overflow-hidden rounded-[2rem] border text-left transition-transform duration-500 ease-out hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2"
                style={{
                  borderColor: 'var(--pictures-line)',
                  backgroundColor: 'var(--pictures-bg-soft)',
                  boxShadow: '0 26px 80px var(--pictures-shadow-accent)',
                  ['--tw-ring-color' as string]: 'color-mix(in srgb, var(--pictures-accent) 34%, transparent)',
                }}
              >
                <div className="relative aspect-[16/11] w-full overflow-hidden rounded-[1.75rem]">
                  <Image
                    src={resolvePictureListSrc(featuredItem.src)}
                    alt=""
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                    unoptimized={featuredItem.src.startsWith('http')}
                  />
                </div>
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4 pt-12 text-[var(--theme-text-inverse)] sm:px-6 sm:pb-6 sm:pt-16"
                  style={{
                    background:
                      'linear-gradient(to top, color-mix(in srgb, var(--theme-text-primary) 68%, transparent), color-mix(in srgb, var(--theme-text-primary) 24%, transparent), transparent)',
                  }}
                >
                  <p
                    className="text-[0.68rem] uppercase tracking-[0.34em]"
                    style={{
                      color: 'color-mix(in srgb, var(--theme-text-inverse) 68%, transparent)',
                    }}
                  >
                    Featured Frame
                  </p>
                  <p
                    className="mt-2 text-[1.75rem] leading-none tracking-[-0.05em] sm:text-4xl"
                    style={{ fontFamily: 'var(--pictures-font-serif), Georgia, serif' }}
                  >
                    Quiet Material
                  </p>
                </div>
              </button>

              <div
                className="flex h-full flex-col justify-between gap-5 rounded-[2rem] border p-5 sm:gap-6 sm:p-8"
                style={{
                  borderColor: 'var(--pictures-line)',
                  backgroundColor: 'var(--pictures-panel)',
                  boxShadow: '0 18px 60px var(--pictures-shadow)',
                }}
              >
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.34em] text-[var(--pictures-muted)]">
                    Curator&apos;s Note
                  </p>
                  <p
                    className="mt-4 text-[1.9rem] leading-[1.05] tracking-[-0.05em] text-[var(--pictures-ink-strong)] sm:text-4xl"
                    style={{ fontFamily: 'var(--pictures-font-serif), Georgia, serif' }}
                  >
                    用更平静的节奏，放大图像本身的质地。
                  </p>
                  <p className="mt-5 max-w-md text-sm leading-7 text-[var(--pictures-ink)]">
                    这页不再强调可拖拽的趣味，而是强调编排、呼吸感与观看顺序。每张图都有更从容的落点，整体更像一个小型线上展陈。
                  </p>
                </div>

                <div
                  className="grid gap-4 border-t pt-5 text-sm text-[var(--pictures-ink)]"
                  style={{ borderColor: 'var(--pictures-line)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="uppercase tracking-[0.24em] text-[0.68rem] text-[var(--pictures-muted)]">
                      Date
                    </span>
                    <span className="text-right">{formatDateLabel(featuredItem.date)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="uppercase tracking-[0.24em] text-[0.68rem] text-[var(--pictures-muted)]">
                      Sequence
                    </span>
                    <span>Frame 01</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="uppercase tracking-[0.24em] text-[0.68rem] text-[var(--pictures-muted)]">
                      Access
                    </span>
                    <span>Tap to open</span>
                  </div>
                </div>
              </div>
            </motion.section>
          ) : null}

          <section
            className="grid gap-6 border-t pt-8 sm:gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10"
            style={{ borderColor: 'var(--pictures-line)' }}
          >
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-[0.68rem] uppercase tracking-[0.34em] text-[var(--pictures-muted)]">
                Archive Index
              </p>
              <p
                className="mt-3 text-2xl tracking-[-0.04em] text-[var(--pictures-ink-strong)]"
                style={{ fontFamily: 'var(--pictures-font-serif), Georgia, serif' }}
              >
                Selected works
              </p>
              <p className="mt-4 max-w-[18rem] text-sm leading-7 text-[var(--pictures-ink)]">
                图片以不对称的节奏被排列。没有厚重卡片边框，只有更轻的编目感和更大的观看空间。
              </p>
            </div>

            <div className="columns-1 gap-4 sm:columns-2 sm:gap-5 xl:columns-3">
              {galleryItems.map((item, index) => (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => openPreview(item)}
                  className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-[1.4rem] border p-2 text-left transition-transform duration-500 ease-out hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 sm:mb-5 sm:rounded-[1.6rem]"
                  style={{
                    borderColor: 'var(--pictures-line)',
                    backgroundColor: 'var(--pictures-panel-soft)',
                    boxShadow: '0 16px 45px var(--pictures-shadow)',
                    ['--tw-ring-color' as string]: 'color-mix(in srgb, var(--pictures-accent) 28%, transparent)',
                  }}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.52,
                    delay: Math.min(index * 0.05, 0.35),
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <figure className="overflow-hidden rounded-[1.2rem]" style={{ backgroundColor: 'var(--pictures-bg-muted)' }}>
                    <div
                      className="relative w-full overflow-hidden"
                      style={{ aspectRatio: aspectPattern[index % aspectPattern.length] }}
                    >
                      <Image
                        src={resolvePictureListSrc(item.src)}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                        unoptimized={item.src.startsWith('http')}
                      />
                    </div>
                    <figcaption className="flex flex-col items-start gap-3 px-4 pb-4 pt-3 text-[var(--pictures-ink)] sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                      <div>
                        <p className="text-[0.68rem] uppercase tracking-[0.28em] text-[var(--pictures-muted)]">
                          No.{String(index + 2).padStart(2, '0')}
                        </p>
                        <p
                          className="mt-1 text-xl leading-none tracking-[-0.04em] text-[var(--pictures-ink-strong)]"
                          style={{ fontFamily: 'var(--pictures-font-serif), Georgia, serif' }}
                        >
                          Study
                        </p>
                      </div>
                      <p className="text-xs text-[var(--pictures-muted)]">{formatDateLabel(item.date)}</p>
                    </figcaption>
                  </figure>
                </motion.button>
              ))}
            </div>
          </section>
        </div>
      </section>

      <Lightbox
        open={previewIndex >= 0}
        close={() => setPreviewIndex(-1)}
        slides={slides}
        index={previewIndex >= 0 ? previewIndex : 0}
        plugins={[Zoom]}
        controller={{ closeOnBackdropClick: true }}
        styles={{
          container: {
            backgroundColor: 'var(--pictures-lightbox)',
          },
        }}
      />
    </>
  )
}
