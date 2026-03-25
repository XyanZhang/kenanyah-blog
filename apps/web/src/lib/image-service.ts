import { getApiBaseUrl } from '@/lib/api-client'

export type DynamicImageOptions = {
  width?: number
  height?: number
  quality?: number
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  format?: 'jpeg' | 'png' | 'webp' | 'avif'
}

export function isStaticsSource(src: string): boolean {
  return src.includes('/statics/')
}

export function isPicturesSource(src: string): boolean {
  return src.startsWith('/pictures/') || src.includes('/pictures/')
}

function normalizePicturesPath(src: string): string {
  // 约定：前端 /pictures/** 对应磁盘 apps/api/statics/pictures/**
  // 例如 /pictures/seed/a.jpg -> /statics/pictures/seed/a.jpg
  if (src.startsWith('/pictures/')) {
    return `/statics/pictures/${src.replace(/^\/pictures\//, '')}`
  }
  return src.replace('/pictures/', '/statics/pictures/')
}

function getStaticsBaseUrl(): string {
  const apiBase = getApiBaseUrl()
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    return apiBase.replace(/\/api$/, '')
  }
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  return appUrl || ''
}

function normalizeStaticsPath(src: string): string {
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src
  }
  if (src.startsWith('/statics/')) {
    return src
  }
  const trimmed = src.replace(/^\/+/, '')
  return `/statics/${trimmed}`
}

export function buildDynamicImageUrl(src: string, options: DynamicImageOptions = {}): string {
  const normalized = normalizeStaticsPath(src)
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    const url = new URL(normalized)
    if (options.width) url.searchParams.set('w', String(options.width))
    if (options.height) url.searchParams.set('h', String(options.height))
    if (options.quality) url.searchParams.set('q', String(options.quality))
    if (options.fit) url.searchParams.set('fit', options.fit)
    if (options.format) url.searchParams.set('format', options.format)
    return url.toString()
  }

  const base = getStaticsBaseUrl()
  const url = new URL(normalized, base || 'http://localhost')
  if (options.width) url.searchParams.set('w', String(options.width))
  if (options.height) url.searchParams.set('h', String(options.height))
  if (options.quality) url.searchParams.set('q', String(options.quality))
  if (options.fit) url.searchParams.set('fit', options.fit)
  if (options.format) url.searchParams.set('format', options.format)

  // SSR fallback 使用了占位 origin，这里返回 path + query 即可
  if (!base) {
    return `${url.pathname}${url.search}`
  }
  return url.toString()
}

export function buildPicturesImageUrl(src: string, options?: DynamicImageOptions): string {
  if (!isPicturesSource(src)) return src
  const staticsSrc = normalizePicturesPath(src)
  if (!options) {
    // 详情页默认走后端原图接口（不加尺寸与质量参数）
    return buildDynamicImageUrl(staticsSrc)
  }
  return buildDynamicImageUrl(staticsSrc, options)
}
