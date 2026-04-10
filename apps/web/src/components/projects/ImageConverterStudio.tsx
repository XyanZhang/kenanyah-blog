'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, ImagePlus, RefreshCcw, Scissors, Sparkles } from 'lucide-react'
import { Button, Label, Select, SelectContent, SelectItem, SelectTrigger, Slider, Switch } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  createCropFromPoints,
  createLockedCropFromPoints,
  DEFAULT_CROP,
  fitCropToAspectRatioAroundCenter,
  getCropAspectRatio,
  getCropResizeAnchor,
  OUTPUT_FORMAT_OPTIONS,
  drawRoundedRectPath,
  formatBytes,
  getCenteredAspectCrop,
  getCropPixels,
  getOutputFilename,
  getSuggestedOutputFormat,
  lockCropToAspectRatio,
  sanitizeCropPoint,
  translateCrop,
  type CropRect,
  type CropPoint,
  type CropResizeHandle,
  type OutputFormat,
  updateCrop as patchCrop,
} from '@/lib/image-converter'

interface LoadedImage {
  name: string
  size: number
  type: string
  width: number
  height: number
  src: string
}

interface ExportSummary {
  name: string
  format: OutputFormat
  size: number
  width: number
  height: number
}

type AspectLockPreset = 'current' | 'original' | '1:1' | '3:2' | '4:5' | '16:9'

async function loadImageFromUrl(url: string) {
  const image = new Image()
  image.decoding = 'async'

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('图片读取失败，请换一张试试。'))
    image.src = url
  })

  return image
}

async function canvasToBlob(canvas: HTMLCanvasElement, format: OutputFormat, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('当前浏览器没有成功导出图片，请稍后重试。'))
        return
      }
      resolve(blob)
    }, format, quality)
  })
}

const presetButtons = [
  { label: '原图', value: 'full' },
  { label: '1:1', value: 'square' },
  { label: '16:9', value: 'landscape' },
  { label: '4:5', value: 'portrait' },
] as const

const aspectLockOptions: Array<{ label: string; value: AspectLockPreset }> = [
  { label: '当前比例', value: 'current' },
  { label: '原图比例', value: 'original' },
  { label: '1:1', value: '1:1' },
  { label: '3:2', value: '3:2' },
  { label: '4:5', value: '4:5' },
  { label: '16:9', value: '16:9' },
]

const resizeHandles: Array<{
  handle: CropResizeHandle
  className: string
  cursor: string
}> = [
  { handle: 'nw', className: '-left-2 -top-2', cursor: 'cursor-nwse-resize' },
  { handle: 'ne', className: '-right-2 -top-2', cursor: 'cursor-nesw-resize' },
  { handle: 'sw', className: '-bottom-2 -left-2', cursor: 'cursor-nesw-resize' },
  { handle: 'se', className: '-bottom-2 -right-2', cursor: 'cursor-nwse-resize' },
]

type DragInteraction = 'draw' | 'move' | 'resize'
type MobilePanel = 'crop' | 'preview' | 'controls'

interface DragState {
  mode: DragInteraction
  pointerId: number
  startPoint: CropPoint
  initialCrop: CropRect
  resizeHandle?: CropResizeHandle
}

export function ImageConverterStudio() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cropAreaRef = useRef<HTMLDivElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const sourceImageRef = useRef<HTMLImageElement | null>(null)
  const dragStateRef = useRef<DragState | null>(null)

  const [source, setSource] = useState<LoadedImage | null>(null)
  const [crop, setCrop] = useState<CropRect>(DEFAULT_CROP)
  const [format, setFormat] = useState<OutputFormat>('image/png')
  const [quality, setQuality] = useState(92)
  const [cornerRadius, setCornerRadius] = useState(0)
  const [jpegBackground, setJpegBackground] = useState('#ffffff')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastExport, setLastExport] = useState<ExportSummary | null>(null)
  const [activeDragMode, setActiveDragMode] = useState<DragInteraction | null>(null)
  const [aspectLockEnabled, setAspectLockEnabled] = useState(false)
  const [aspectLockPreset, setAspectLockPreset] = useState<AspectLockPreset>('current')
  const [aspectLockRatio, setAspectLockRatio] = useState<number | null>(null)
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('crop')

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  const cropPixels = useMemo(() => {
    if (!source) return null
    return getCropPixels(source.width, source.height, crop)
  }, [crop, source])

  const currentCropAspectRatio = source ? getCropAspectRatio(crop, source.width, source.height) : null
  const activeLockedAspectRatio = aspectLockEnabled ? aspectLockRatio : null
  const previewAspectRatio = cropPixels ? `${cropPixels.width} / ${cropPixels.height}` : '1 / 1'
  const previewImageWidth = 10000 / crop.width
  const previewImageLeft = -(crop.x / crop.width) * 100
  const previewImageTop = -(crop.y / crop.height) * 100
  const selectedFormat = OUTPUT_FORMAT_OPTIONS.find((option) => option.value === format)
  const mobileWorkspaceHeightClass = 'h-[min(50dvh,29rem)] min-h-[17.5rem] sm:h-[min(54dvh,33rem)]'
  const cropAreaCursorClass = activeDragMode === 'move'
    ? 'cursor-grabbing'
    : activeDragMode === 'resize'
      ? 'cursor-grabbing'
      : 'cursor-crosshair'

  const resolveAspectRatio = (preset: AspectLockPreset, nextCrop: CropRect = crop) => {
    if (!source) return null

    switch (preset) {
      case 'current':
        return getCropAspectRatio(nextCrop, source.width, source.height)
      case 'original':
        return source.width / source.height
      case '1:1':
        return 1
      case '3:2':
        return 3 / 2
      case '4:5':
        return 4 / 5
      case '16:9':
        return 16 / 9
    }
  }

  const resetEditor = () => {
    setCrop(DEFAULT_CROP)
    setCornerRadius(0)
    setQuality(92)
    setJpegBackground('#ffffff')
    setLastExport(null)
    setError(null)
    dragStateRef.current = null
    setActiveDragMode(null)
    setAspectLockEnabled(false)
    setAspectLockPreset('current')
    setAspectLockRatio(null)
    setMobilePanel('crop')
  }

  const handleClearSource = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    sourceImageRef.current = null
    dragStateRef.current = null
    setSource(null)
    setFormat('image/png')
    setActiveDragMode(null)
    resetEditor()
  }

  const handleUpload = async (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('这里只支持图片文件。')
      return
    }

    const nextUrl = URL.createObjectURL(file)
    setError(null)

    try {
      const image = await loadImageFromUrl(nextUrl)

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }

      objectUrlRef.current = nextUrl
      sourceImageRef.current = image
      setSource({
        name: file.name,
        size: file.size,
        type: file.type || 'image/*',
        width: image.naturalWidth,
        height: image.naturalHeight,
        src: nextUrl,
      })
      setFormat(getSuggestedOutputFormat(file.type))
      resetEditor()
    } catch (uploadError) {
      URL.revokeObjectURL(nextUrl)
      setError(uploadError instanceof Error ? uploadError.message : '图片加载失败。')
    }
  }

  const applyPreset = (preset: (typeof presetButtons)[number]['value']) => {
    if (!source) return

    if (preset === 'full') {
      setCrop(DEFAULT_CROP)
      if (aspectLockEnabled) {
        setAspectLockPreset('original')
        setAspectLockRatio(source.width / source.height)
      }
      return
    }

    if (preset === 'square') {
      setCrop(getCenteredAspectCrop(source.width, source.height, 1))
      if (aspectLockEnabled) {
        setAspectLockPreset('1:1')
        setAspectLockRatio(1)
      }
      return
    }

    if (preset === 'landscape') {
      setCrop(getCenteredAspectCrop(source.width, source.height, 16 / 9))
      if (aspectLockEnabled) {
        setAspectLockPreset('16:9')
        setAspectLockRatio(16 / 9)
      }
      return
    }

    setCrop(getCenteredAspectCrop(source.width, source.height, 4 / 5))
    if (aspectLockEnabled) {
      setAspectLockPreset('4:5')
      setAspectLockRatio(4 / 5)
    }
  }

  const updateCrop = (patch: Partial<CropRect>, driver?: 'width' | 'height') => {
    setCrop((currentCrop) => {
      const nextCrop = patchCrop(currentCrop, patch)
      if (!source || !activeLockedAspectRatio || (!('width' in patch) && !('height' in patch))) {
        return nextCrop
      }

      return lockCropToAspectRatio(
        nextCrop,
        source.width,
        source.height,
        activeLockedAspectRatio,
        driver ?? ('height' in patch ? 'height' : 'width')
      )
    })
  }

  const handleAspectLockChange = (checked: boolean) => {
    setAspectLockEnabled(checked)

    if (!checked) {
      setAspectLockRatio(null)
      return
    }

    const nextRatio = resolveAspectRatio(aspectLockPreset)
    setAspectLockRatio(nextRatio)

    if (source && nextRatio) {
      setCrop((currentCrop) =>
        fitCropToAspectRatioAroundCenter(currentCrop, source.width, source.height, nextRatio)
      )
    }
  }

  const handleAspectPresetChange = (value: string) => {
    const nextPreset = value as AspectLockPreset
    setAspectLockPreset(nextPreset)

    const nextRatio = resolveAspectRatio(nextPreset)
    setAspectLockRatio(nextRatio)

    if (source && nextRatio) {
      setCrop((currentCrop) =>
        fitCropToAspectRatioAroundCenter(currentCrop, source.width, source.height, nextRatio)
      )
    }
  }

  const getCropPointFromPointer = (clientX: number, clientY: number) => {
    if (!cropAreaRef.current) return null

    const rect = cropAreaRef.current.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null

    return sanitizeCropPoint({
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    })
  }

  const releaseCropPointer = (pointerId: number) => {
    if (!cropAreaRef.current) return
    if (!cropAreaRef.current.hasPointerCapture(pointerId)) return
    cropAreaRef.current.releasePointerCapture(pointerId)
  }

  const stopDrag = (pointerId: number) => {
    dragStateRef.current = null
    setActiveDragMode(null)
    releaseCropPointer(pointerId)
  }

  const startDrag = (
    event: React.PointerEvent<HTMLElement>,
    mode: DragInteraction,
    resizeHandle?: CropResizeHandle
  ) => {
    if (!source || event.button !== 0) return

    const point = getCropPointFromPointer(event.clientX, event.clientY)
    if (!point) return

    event.preventDefault()
    event.stopPropagation()

    cropAreaRef.current?.setPointerCapture(event.pointerId)
    dragStateRef.current = {
      mode,
      pointerId: event.pointerId,
      startPoint: point,
      initialCrop: crop,
      resizeHandle,
    }
    setActiveDragMode(mode)
  }

  const handleCropPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    const point = getCropPointFromPointer(event.clientX, event.clientY)
    if (!point) return

    event.preventDefault()

    if (dragState.mode === 'draw') {
      if (source && activeLockedAspectRatio) {
        setCrop(createLockedCropFromPoints(
          dragState.startPoint,
          point,
          source.width,
          source.height,
          activeLockedAspectRatio
        ))
      } else {
        setCrop(createCropFromPoints(dragState.startPoint, point))
      }
      return
    }

    if (dragState.mode === 'move') {
      setCrop(translateCrop(
        dragState.initialCrop,
        point.x - dragState.startPoint.x,
        point.y - dragState.startPoint.y
      ))
      return
    }

    if (!dragState.resizeHandle) return

    const anchor = getCropResizeAnchor(dragState.initialCrop, dragState.resizeHandle)
    if (source && activeLockedAspectRatio) {
      setCrop(createLockedCropFromPoints(anchor, point, source.width, source.height, activeLockedAspectRatio))
    } else {
      setCrop(createCropFromPoints(anchor, point))
    }
  }

  const handleCropPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    event.preventDefault()
    stopDrag(event.pointerId)
  }

  const handleDownload = async () => {
    if (!source || !cropPixels || !sourceImageRef.current) return

    setExporting(true)
    setError(null)

    try {
      const canvas = document.createElement('canvas')
      canvas.width = cropPixels.width
      canvas.height = cropPixels.height
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('当前环境不支持图片导出。')
      }

      if (format === 'image/jpeg') {
        context.fillStyle = jpegBackground
        context.fillRect(0, 0, canvas.width, canvas.height)
      } else {
        context.clearRect(0, 0, canvas.width, canvas.height)
      }

      const radiusPx = Math.round((Math.min(canvas.width, canvas.height) * cornerRadius) / 100)

      context.save()
      drawRoundedRectPath(context, 0, 0, canvas.width, canvas.height, radiusPx)
      context.clip()
      context.drawImage(
        sourceImageRef.current,
        cropPixels.x,
        cropPixels.y,
        cropPixels.width,
        cropPixels.height,
        0,
        0,
        canvas.width,
        canvas.height
      )
      context.restore()

      const blob = await canvasToBlob(canvas, format, format === 'image/png' ? undefined : quality / 100)
      const filename = getOutputFilename(source.name, format)
      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = filename
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)

      setLastExport({
        name: filename,
        format,
        size: blob.size,
        width: canvas.width,
        height: canvas.height,
      })
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : '图片导出失败。')
    } finally {
      setExporting(false)
    }
  }

  const cropWorkspace = source ? (
    <section className="flex h-full flex-col rounded-[20px] border border-line-glass bg-surface-glass/60 p-2.5 backdrop-blur-sm sm:p-3">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-content-primary sm:mb-2 sm:text-sm">
        <Scissors className="h-3.5 w-3.5 text-accent-primary" />
        裁剪范围
      </div>
      <div className="flex flex-1 min-h-0 items-center justify-center overflow-hidden">
        <div
          className="relative max-h-full max-w-full overflow-hidden rounded-[16px] border border-line-glass/80 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),rgba(15,23,42,0.08))] p-2 shadow-inner"
          style={{ aspectRatio: `${source.width} / ${source.height}`, maxHeight: '100%' }}
        >
          <div
            ref={cropAreaRef}
            className={cn(
              'relative h-full w-full overflow-hidden rounded-[12px] touch-none select-none',
              cropAreaCursorClass
            )}
            onPointerMove={handleCropPointerMove}
            onPointerUp={handleCropPointerUp}
            onPointerCancel={handleCropPointerUp}
          >
            <img
              src={source.src}
              alt="上传图片预览"
              draggable={false}
              className="pointer-events-none h-full w-full object-cover"
            />
            <button
              type="button"
              aria-label="拖拽框选裁剪区域"
              className="absolute inset-0 z-0 cursor-crosshair bg-transparent"
              onPointerDown={(event) => startDrag(event, 'draw')}
            />
            <div
              className={cn(
                'absolute z-10 border-2 border-dashed border-white/90 bg-black/18 shadow-[0_0_0_999px_rgba(15,23,42,0.36)]',
                activeDragMode ? 'transition-none' : 'transition-all duration-150'
              )}
              style={{
                left: `${crop.x}%`,
                top: `${crop.y}%`,
                width: `${crop.width}%`,
                height: `${crop.height}%`,
              }}
            >
              <button
                type="button"
                aria-label="拖动裁剪框"
                className={cn('absolute inset-0 cursor-move bg-transparent', activeDragMode === 'move' && 'cursor-grabbing')}
                onPointerDown={(event) => startDrag(event, 'move')}
              />
              <div className="pointer-events-none absolute inset-2 rounded-[10px] border border-white/40" />
              <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/35" />
              <div className="pointer-events-none absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-white/35" />
              {resizeHandles.map((item) => (
                <button
                  key={item.handle}
                  type="button"
                  aria-label={`调整裁剪框 ${item.handle}`}
                  className={cn(
                    'absolute z-20 h-3.5 w-3.5 rounded-full border-2 border-white bg-accent-primary shadow-[0_3px_10px_rgba(13,148,136,0.35)]',
                    item.className,
                    item.cursor
                  )}
                  onPointerDown={(event) => startDrag(event, 'resize', item.handle)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  ) : null

  const previewWorkspace = source ? (
    <section className="flex h-full flex-col rounded-[20px] border border-line-glass bg-surface-glass/60 p-2.5 backdrop-blur-sm sm:p-3">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-content-primary sm:mb-2 sm:text-sm">
        <Sparkles className="h-3.5 w-3.5 text-accent-primary" />
        成品预览
      </div>
      <div className="flex flex-1 min-h-0 items-center justify-center overflow-hidden">
        <div className="h-full w-full rounded-[16px] border border-line-glass/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(15,23,42,0.1))] p-2">
          <div
            className="relative mx-auto h-full max-h-full overflow-hidden shadow-[0_20px_55px_rgba(15,23,42,0.18)]"
            style={{
              borderRadius: `${cornerRadius}%`,
              aspectRatio: previewAspectRatio,
              backgroundColor: format === 'image/jpeg' ? jpegBackground : 'transparent',
            }}
          >
            <img
              src={source.src}
              alt="处理结果预览"
              className="absolute max-w-none transition-all duration-200"
              style={{
                width: `${previewImageWidth}%`,
                height: 'auto',
                left: `${previewImageLeft}%`,
                top: `${previewImageTop}%`,
              }}
            />
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-2 text-[11px] text-content-secondary">
        <span className="flex-1 rounded-xl border border-line-glass/70 bg-surface-glass/35 px-2.5 py-1 text-center">
          {cropPixels ? `${cropPixels.width}×${cropPixels.height}` : '等待裁剪'}
        </span>
        <span className="flex-1 rounded-xl border border-line-glass/70 bg-surface-glass/35 px-2.5 py-1 text-center">
          圆角 {cornerRadius.toFixed(0)}%
        </span>
      </div>
    </section>
  ) : null

  const controlsWorkspace = source ? (
    <aside className="flex h-full flex-col rounded-[20px] border border-line-glass bg-surface-glass/60 p-2.5 backdrop-blur-sm sm:p-3">
      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-2.5 sm:gap-3">
          {/* Export format & quality */}
          <div className="rounded-xl border border-line-glass/70 bg-surface-glass/35 p-2.5 sm:p-3">
            <div className="grid gap-2.5">
              <div className="grid grid-cols-[3.8rem_minmax(0,1fr)] items-center gap-2">
                <Label className="text-[11px] text-content-primary sm:text-xs">导出格式</Label>
                <Select value={format} onValueChange={(value) => setFormat(value as OutputFormat)}>
                  <SelectTrigger className="h-8 rounded-lg border-line-glass bg-surface-glass/40 text-xs">
                    <span>{selectedFormat?.label ?? 'PNG'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_FORMAT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-[3.8rem_minmax(0,1fr)_2.5rem] items-center gap-2">
                <Label className="text-[11px] text-content-primary sm:text-xs">压缩质量</Label>
                <Slider
                  value={quality}
                  min={20}
                  max={100}
                  step={1}
                  disabled={format === 'image/png'}
                  onValueChange={setQuality}
                />
                <span className="text-right text-[11px] text-content-muted">{quality}%</span>
              </div>

              {format === 'image/jpeg' ? (
                <div className="flex items-center gap-2 rounded-xl border border-line-glass/70 bg-surface-glass/30 px-2.5 py-1.5">
                  <Label className="text-[11px] text-content-primary">背景色</Label>
                  <input
                    type="color"
                    value={jpegBackground}
                    onChange={(event) => setJpegBackground(event.currentTarget.value)}
                    className="h-7 w-8 cursor-pointer rounded-md border border-line-glass bg-transparent"
                  />
                  <span className="text-[10px] font-medium text-content-secondary">{jpegBackground.toUpperCase()}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Aspect lock + presets in one row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-line-glass/70 bg-surface-glass/35 p-2.5 sm:p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-content-primary sm:text-xs">比例锁定</span>
                <Switch checked={aspectLockEnabled} onCheckedChange={handleAspectLockChange} disabled={!source} />
              </div>
              <div className={cn('mt-2', !aspectLockEnabled && 'pointer-events-none opacity-60')}>
                <Select value={aspectLockPreset} onValueChange={handleAspectPresetChange}>
                  <SelectTrigger className="h-8 rounded-lg border-line-glass bg-surface-glass/40 text-xs">
                    <span>{aspectLockOptions.find((item) => item.value === aspectLockPreset)?.label ?? '当前比例'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {aspectLockOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl border border-line-glass/70 bg-surface-glass/35 p-2.5 sm:p-3">
              <span className="text-[11px] font-medium text-content-primary sm:text-xs">快速比例</span>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {presetButtons.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => applyPreset(preset.value)}
                    className="rounded-lg border border-line-glass bg-surface-glass/40 px-2 py-1 text-center text-[11px] font-medium text-content-secondary transition-colors hover:border-line-hover hover:text-content-primary"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Crop sliders */}
          <div className="rounded-xl border border-line-glass/70 bg-surface-glass/35 p-2.5 sm:p-3">
            <div className="grid gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[11px] text-content-primary">水平偏移</Label>
                  <span className="text-[11px] text-content-muted">{crop.x.toFixed(0)}%</span>
                </div>
                <Slider value={crop.x} min={0} max={100 - crop.width} step={1} onValueChange={(value) => updateCrop({ x: value })} />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[11px] text-content-primary">垂直偏移</Label>
                  <span className="text-[11px] text-content-muted">{crop.y.toFixed(0)}%</span>
                </div>
                <Slider value={crop.y} min={0} max={100 - crop.height} step={1} onValueChange={(value) => updateCrop({ y: value })} />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[11px] text-content-primary">裁剪宽度</Label>
                  <span className="text-[11px] text-content-muted">{crop.width.toFixed(0)}%</span>
                </div>
                <Slider value={crop.width} min={5} max={100} step={1} onValueChange={(value) => updateCrop({ width: value }, 'width')} />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[11px] text-content-primary">裁剪高度</Label>
                  <span className="text-[11px] text-content-muted">{crop.height.toFixed(0)}%</span>
                </div>
                <Slider value={crop.height} min={5} max={100} step={1} onValueChange={(value) => updateCrop({ height: value }, 'height')} />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[11px] text-content-primary">圆角强度</Label>
                  <span className="text-[11px] text-content-muted">{cornerRadius.toFixed(0)}%</span>
                </div>
                <Slider value={cornerRadius} min={0} max={50} step={1} onValueChange={setCornerRadius} />
              </div>
            </div>
          </div>

          {/* File info summary */}
          <div className="rounded-xl border border-line-glass/70 bg-surface-glass/35 p-2.5 text-[11px] text-content-secondary sm:p-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex items-center justify-between gap-2">
                <span>格式</span>
                <span className="font-medium text-content-primary">{selectedFormat?.label ?? 'PNG'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>大小</span>
                <span className="font-medium text-content-primary">{formatBytes(source.size)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>比例</span>
                <span className="font-medium text-content-primary">
                  {currentCropAspectRatio ? currentCropAspectRatio.toFixed(2) : '--'}
                </span>
              </div>
              {lastExport ? (
                <div className="flex items-center justify-between gap-2">
                  <span>导出</span>
                  <span className="font-medium text-content-primary">{formatBytes(lastExport.size)}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 shrink-0">
        <Button
          type="button"
          className="h-9 gap-1.5 rounded-xl text-xs"
          disabled={!source || exporting}
          onClick={handleDownload}
        >
          <Download className="h-3.5 w-3.5" />
          {exporting ? '导出中...' : '下载'}
        </Button>
        <Button type="button" variant="outline" className="h-9 rounded-xl text-xs" onClick={resetEditor}>
          重置参数
        </Button>
      </div>
    </aside>
  ) : null

  const emptyState = (
    <section className="flex flex-1 flex-col items-center justify-center rounded-[28px] border border-dashed border-line-glass bg-surface-glass/40 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-primary/10 text-accent-primary">
        <ImagePlus className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-content-primary">先上传一张图片</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-content-secondary">
        支持 PNG、JPEG、WebP 等常见图片。上传后可以直接框选裁剪、锁定比例、改格式并下载结果。
      </p>
      <Button
        type="button"
        className="mt-6 gap-2 rounded-2xl px-5"
        onClick={() => fileInputRef.current?.click()}
      >
        <ImagePlus className="h-4 w-4" />
        选择图片开始
      </Button>
    </section>
  )

  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-[1600px] flex-col overflow-hidden p-3 sm:p-4">
      {/* Compact header toolbar */}
      <section className="flex items-center justify-between gap-3 rounded-[20px] border border-line-glass bg-surface-glass/72 px-3 py-2 shadow-[0_14px_50px_rgba(15,23,42,0.14)] backdrop-blur-sm sm:px-4 sm:py-2.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent-primary/20 bg-accent-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-accent-primary sm:text-[11px]">
            <Sparkles className="h-3 w-3" />
            Local
          </div>
          <h1 className="text-sm font-semibold text-content-primary sm:text-base">图片格式转换</h1>
          {source ? (
            <div className="hidden items-center gap-2 lg:flex">
              <span className="truncate rounded-full border border-line-glass/70 bg-surface-glass/40 px-2.5 py-0.5 text-[11px] text-content-secondary">
                {source.name}
              </span>
              <span className="rounded-full border border-line-glass/70 bg-surface-glass/40 px-2.5 py-0.5 text-[11px] text-content-secondary">
                {source.width}×{source.height}
              </span>
              <span className="rounded-full border border-line-glass/70 bg-surface-glass/40 px-2.5 py-0.5 text-[11px] text-content-secondary">
                {cropPixels ? `${cropPixels.width}×${cropPixels.height}` : '--'}
              </span>
              <span className="rounded-full border border-line-glass/70 bg-surface-glass/40 px-2.5 py-0.5 text-[11px] text-content-secondary">
                {aspectLockEnabled ? aspectLockOptions.find((item) => item.value === aspectLockPreset)?.label ?? '已锁定' : '自由'}
              </span>
            </div>
          ) : (
            <span className="hidden text-xs text-content-secondary sm:inline">浏览器本地完成格式转换、裁剪、圆角和下载。</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
            className="hidden"
            onChange={async (event) => {
              const input = event.currentTarget
              const file = event.currentTarget.files?.[0] ?? null
              await handleUpload(file)
              input.value = ''
            }}
          />
          <Button
            type="button"
            className="h-8 gap-1.5 rounded-xl px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {source ? '更换' : '选择图片'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 gap-1.5 rounded-xl px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
            disabled={!source}
            onClick={source ? handleClearSource : undefined}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            清空
          </Button>
        </div>
      </section>

      {error ? (
        <div className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 shrink-0">
          {error}
        </div>
      ) : null}

      {source ? (
        <div className="mt-2 flex-1 min-h-0 flex flex-col lg:flex-row gap-2.5">
          {/* Mobile tab bar */}
          <div className="lg:hidden shrink-0">
            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-line-glass bg-surface-glass/55 p-1 backdrop-blur-sm">
              {([
                { key: 'crop', label: '裁剪' },
                { key: 'preview', label: '预览' },
                { key: 'controls', label: '参数' },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMobilePanel(item.key)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    mobilePanel === item.key
                      ? 'bg-accent-primary text-white shadow-[0_8px_20px_rgba(13,148,136,0.28)]'
                      : 'text-content-secondary hover:bg-surface-glass/50 hover:text-content-primary'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile workspace */}
          <div className={cn('flex-1 min-h-0 lg:hidden', mobileWorkspaceHeightClass)}>
            {mobilePanel === 'crop' ? cropWorkspace : null}
            {mobilePanel === 'preview' ? previewWorkspace : null}
            {mobilePanel === 'controls' ? controlsWorkspace : null}
          </div>

          {/* Desktop: left side (crop + preview) + right side (controls) */}
          <div className="hidden min-h-0 flex-1 gap-2.5 lg:flex">
            {/* Left column: crop on top, preview below */}
            <div className="flex min-h-0 flex-1 flex-col gap-2.5">
              <div className="flex-[1.15] min-h-0">
                {cropWorkspace}
              </div>
              <div className="flex-[0.85] min-h-0">
                {previewWorkspace}
              </div>
            </div>
            {/* Right column: controls */}
            <div className="w-[320px] xl:w-[360px] shrink-0">
              {controlsWorkspace}
            </div>
          </div>
        </div>
      ) : (
        emptyState
      )}
    </main>
  )
}
