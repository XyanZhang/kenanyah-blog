export type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp'

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface CropPoint {
  x: number
  y: number
}

export interface CropPixels {
  x: number
  y: number
  width: number
  height: number
}

export type CropResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

export const DEFAULT_CROP: CropRect = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
}

export const OUTPUT_FORMAT_OPTIONS: Array<{ value: OutputFormat; label: string; extension: string }> = [
  { value: 'image/png', label: 'PNG', extension: 'png' },
  { value: 'image/jpeg', label: 'JPEG', extension: 'jpg' },
  { value: 'image/webp', label: 'WebP', extension: 'webp' },
]

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100
}

export function sanitizeCrop(crop: CropRect): CropRect {
  const width = clamp(Number.isFinite(crop.width) ? crop.width : DEFAULT_CROP.width, 5, 100)
  const height = clamp(Number.isFinite(crop.height) ? crop.height : DEFAULT_CROP.height, 5, 100)
  const x = clamp(Number.isFinite(crop.x) ? crop.x : DEFAULT_CROP.x, 0, 100 - width)
  const y = clamp(Number.isFinite(crop.y) ? crop.y : DEFAULT_CROP.y, 0, 100 - height)

  return {
    x: roundToTwo(x),
    y: roundToTwo(y),
    width: roundToTwo(width),
    height: roundToTwo(height),
  }
}

export function sanitizeCropPoint(point: CropPoint): CropPoint {
  return {
    x: roundToTwo(clamp(Number.isFinite(point.x) ? point.x : 0, 0, 100)),
    y: roundToTwo(clamp(Number.isFinite(point.y) ? point.y : 0, 0, 100)),
  }
}

export function updateCrop(crop: CropRect, patch: Partial<CropRect>) {
  return sanitizeCrop({ ...crop, ...patch })
}

function getSourceAspectRatio(sourceWidth: number, sourceHeight: number) {
  if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) {
    return 1
  }

  return sourceWidth / sourceHeight
}

function getPercentRatioForAspect(targetAspectRatio: number, sourceWidth: number, sourceHeight: number) {
  if (!Number.isFinite(targetAspectRatio) || targetAspectRatio <= 0) {
    return 1
  }

  return targetAspectRatio / getSourceAspectRatio(sourceWidth, sourceHeight)
}

export function createCropFromPoints(start: CropPoint, end: CropPoint, minSize = 5): CropRect {
  const safeStart = sanitizeCropPoint(start)
  const safeEnd = sanitizeCropPoint(end)
  const x = Math.min(safeStart.x, safeEnd.x)
  const y = Math.min(safeStart.y, safeEnd.y)
  const width = Math.max(Math.abs(safeEnd.x - safeStart.x), minSize)
  const height = Math.max(Math.abs(safeEnd.y - safeStart.y), minSize)

  return sanitizeCrop({ x, y, width, height })
}

export function createLockedCropFromPoints(
  start: CropPoint,
  end: CropPoint,
  sourceWidth: number,
  sourceHeight: number,
  targetAspectRatio: number,
  minSize = 5
): CropRect {
  const safeStart = sanitizeCropPoint(start)
  const safeEnd = sanitizeCropPoint(end)
  const percentRatio = getPercentRatioForAspect(targetAspectRatio, sourceWidth, sourceHeight)

  if (!Number.isFinite(percentRatio) || percentRatio <= 0) {
    return createCropFromPoints(start, end, minSize)
  }

  const deltaX = safeEnd.x - safeStart.x
  const deltaY = safeEnd.y - safeStart.y
  const signX = deltaX >= 0 ? 1 : -1
  const signY = deltaY >= 0 ? 1 : -1
  const availableWidth = signX > 0 ? 100 - safeStart.x : safeStart.x
  const availableHeight = signY > 0 ? 100 - safeStart.y : safeStart.y
  const rawWidth = Math.abs(deltaX)
  const rawHeight = Math.abs(deltaY)
  const heightFromWidth = rawWidth / percentRatio
  const widthFromHeight = rawHeight * percentRatio

  let width = rawWidth
  let height = heightFromWidth

  if (Math.abs(heightFromWidth - rawHeight) > Math.abs(widthFromHeight - rawWidth)) {
    width = widthFromHeight
    height = rawHeight
  }

  if (width < minSize) {
    width = minSize
    height = width / percentRatio
  }

  if (height < minSize) {
    height = minSize
    width = height * percentRatio
  }

  const maxWidth = Math.min(availableWidth, availableHeight * percentRatio)
  if (width > maxWidth) {
    width = maxWidth
    height = width / percentRatio
  }

  if (height > availableHeight) {
    height = availableHeight
    width = height * percentRatio
  }

  const x = signX > 0 ? safeStart.x : safeStart.x - width
  const y = signY > 0 ? safeStart.y : safeStart.y - height

  return sanitizeCrop({ x, y, width, height })
}

export function translateCrop(crop: CropRect, deltaX: number, deltaY: number) {
  return updateCrop(crop, {
    x: crop.x + deltaX,
    y: crop.y + deltaY,
  })
}

export function getCropResizeAnchor(crop: CropRect, handle: CropResizeHandle): CropPoint {
  const safeCrop = sanitizeCrop(crop)

  switch (handle) {
    case 'nw':
      return { x: safeCrop.x + safeCrop.width, y: safeCrop.y + safeCrop.height }
    case 'ne':
      return { x: safeCrop.x, y: safeCrop.y + safeCrop.height }
    case 'sw':
      return { x: safeCrop.x + safeCrop.width, y: safeCrop.y }
    case 'se':
      return { x: safeCrop.x, y: safeCrop.y }
  }
}

export function getCropAspectRatio(crop: CropRect, sourceWidth: number, sourceHeight: number) {
  const safeCrop = sanitizeCrop(crop)
  const widthPx = Math.max(1, safeCrop.width) * sourceWidth
  const heightPx = Math.max(1, safeCrop.height) * sourceHeight

  return widthPx / heightPx
}

export function lockCropToAspectRatio(
  crop: CropRect,
  sourceWidth: number,
  sourceHeight: number,
  targetAspectRatio: number,
  driver: 'width' | 'height' = 'width'
) {
  const safeCrop = sanitizeCrop(crop)
  const percentRatio = getPercentRatioForAspect(targetAspectRatio, sourceWidth, sourceHeight)

  if (!Number.isFinite(percentRatio) || percentRatio <= 0) {
    return safeCrop
  }

  let width = safeCrop.width
  let height = safeCrop.height

  if (driver === 'width') {
    height = width / percentRatio
  } else {
    width = height * percentRatio
  }

  if (width > 100 - safeCrop.x) {
    width = 100 - safeCrop.x
    height = width / percentRatio
  }

  if (height > 100 - safeCrop.y) {
    height = 100 - safeCrop.y
    width = height * percentRatio
  }

  return sanitizeCrop({
    ...safeCrop,
    width,
    height,
  })
}

export function fitCropToAspectRatioAroundCenter(
  crop: CropRect,
  sourceWidth: number,
  sourceHeight: number,
  targetAspectRatio: number
) {
  const safeCrop = sanitizeCrop(crop)
  const percentRatio = getPercentRatioForAspect(targetAspectRatio, sourceWidth, sourceHeight)

  if (!Number.isFinite(percentRatio) || percentRatio <= 0) {
    return safeCrop
  }

  const widthFromHeight = safeCrop.height * percentRatio
  const heightFromWidth = safeCrop.width / percentRatio
  const widthDistance = Math.abs(widthFromHeight - safeCrop.width)
  const heightDistance = Math.abs(heightFromWidth - safeCrop.height)

  let width = safeCrop.width
  let height = safeCrop.height

  if (widthDistance <= heightDistance) {
    width = widthFromHeight
  } else {
    height = heightFromWidth
    width = height * percentRatio
  }

  if (width > 100) {
    width = 100
    height = width / percentRatio
  }

  if (height > 100) {
    height = 100
    width = height * percentRatio
  }

  const centerX = safeCrop.x + safeCrop.width / 2
  const centerY = safeCrop.y + safeCrop.height / 2
  const x = clamp(centerX - width / 2, 0, 100 - width)
  const y = clamp(centerY - height / 2, 0, 100 - height)

  return sanitizeCrop({ x, y, width, height })
}

export function getCenteredAspectCrop(sourceWidth: number, sourceHeight: number, targetAspect: number): CropRect {
  if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || !Number.isFinite(targetAspect) || targetAspect <= 0) {
    return DEFAULT_CROP
  }

  const sourceAspect = sourceWidth / sourceHeight
  if (!Number.isFinite(sourceAspect) || sourceAspect <= 0) {
    return DEFAULT_CROP
  }

  if (sourceAspect > targetAspect) {
    const width = (targetAspect / sourceAspect) * 100
    return sanitizeCrop({
      x: (100 - width) / 2,
      y: 0,
      width,
      height: 100,
    })
  }

  const height = (sourceAspect / targetAspect) * 100
  return sanitizeCrop({
    x: 0,
    y: (100 - height) / 2,
    width: 100,
    height,
  })
}

export function getCropPixels(sourceWidth: number, sourceHeight: number, crop: CropRect): CropPixels {
  const safeCrop = sanitizeCrop(crop)
  const width = Math.max(1, Math.round(sourceWidth * (safeCrop.width / 100)))
  const height = Math.max(1, Math.round(sourceHeight * (safeCrop.height / 100)))
  const x = clamp(Math.round(sourceWidth * (safeCrop.x / 100)), 0, Math.max(0, sourceWidth - width))
  const y = clamp(Math.round(sourceHeight * (safeCrop.y / 100)), 0, Math.max(0, sourceHeight - height))

  return { x, y, width, height }
}

export function getSuggestedOutputFormat(fileType?: string): OutputFormat {
  if (fileType === 'image/png' || fileType === 'image/jpeg' || fileType === 'image/webp') {
    return fileType
  }

  return 'image/png'
}

export function getOutputFilename(originalName: string, format: OutputFormat) {
  const formatOption = OUTPUT_FORMAT_OPTIONS.find((option) => option.value === format)
  const extension = formatOption?.extension ?? 'png'
  const normalizedName = originalName.trim() || 'image'
  const baseName = normalizedName.replace(/\.[^./\\]+$/, '') || 'image'

  return `${baseName}.${extension}`
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeRadius = clamp(radius, 0, Math.min(width, height) / 2)

  ctx.beginPath()
  ctx.moveTo(x + safeRadius, y)
  ctx.lineTo(x + width - safeRadius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  ctx.lineTo(x + width, y + height - safeRadius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  ctx.lineTo(x + safeRadius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  ctx.lineTo(x, y + safeRadius)
  ctx.quadraticCurveTo(x, y, x + safeRadius, y)
  ctx.closePath()
}
