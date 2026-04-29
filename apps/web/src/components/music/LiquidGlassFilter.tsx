'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  calculateDisplacementMap,
  calculateDisplacementMap2,
} from '@/lib/liquid-glass/displacementMap'
import { calculateRefractionSpecular } from '@/lib/liquid-glass/specular'
import { CONVEX } from '@/lib/liquid-glass/surfaceEquations'
import { imageDataToUrl } from '@/lib/liquid-glass/imageDataToUrl'

export interface LiquidGlassFilterProps {
  width: number
  height: number
  /** 圆角半径 (px) */
  radius?: number
  /** 边框宽度 (px) */
  bezelWidth?: number
  /** 玻璃厚度，影响折射强度 */
  glassThickness?: number
  /** 折射率 */
  refractiveIndex?: number
  /** 模糊程度 (px)，与 url() 组合使用 */
  blur?: number
  /** 折射强度 0-1 */
  scaleRatio?: number
  /** 高光不透明度 0-1 */
  specularOpacity?: number
  /** 高光饱和度 */
  specularSaturation?: number
  /** CSS backdrop-filter 的饱和度 */
  backdropSaturation?: number
  /** 高光角度 (弧度) */
  specularAngle?: number
  children: React.ReactNode
  className?: string
}

const DEFAULT_RADIUS = 31
const DEFAULT_BEZEL = 29
const DEFAULT_GLASS_THICKNESS = 90
const DEFAULT_REFRACTIVE_INDEX = 1.3
const DEFAULT_BLUR = 1
const DEFAULT_SCALE = 1
const DEFAULT_SPECULAR_OPACITY = 0.4
const DEFAULT_SPECULAR_SATURATION = 6
const DEFAULT_SPECULAR_ANGLE = -Math.PI / 3 // -60°

export function LiquidGlassFilter({
  width: widthProp,
  height: heightProp,
  radius = DEFAULT_RADIUS,
  bezelWidth = DEFAULT_BEZEL,
  glassThickness = DEFAULT_GLASS_THICKNESS,
  refractiveIndex = DEFAULT_REFRACTIVE_INDEX,
  blur = DEFAULT_BLUR,
  scaleRatio = DEFAULT_SCALE,
  specularOpacity = DEFAULT_SPECULAR_OPACITY,
  specularSaturation = DEFAULT_SPECULAR_SATURATION,
  backdropSaturation = 1.2,
  specularAngle = DEFAULT_SPECULAR_ANGLE,
  children,
  className,
}: LiquidGlassFilterProps) {
  const filterId = useId().replace(/:/g, '')
  const containerRef = useRef<HTMLDivElement>(null)
  const [measuredSize, setMeasuredSize] = useState({ width: widthProp, height: heightProp })
  const [displacementDataUrl, setDisplacementDataUrl] = useState<string | null>(
    null
  )
  const [specularDataUrl, setSpecularDataUrl] = useState<string | null>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setMeasuredSize((prev) => {
          if (prev.width === rect.width && prev.height === rect.height) return prev
          return { width: rect.width, height: rect.height }
        })
      }
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const width = measuredSize.width
  const height = measuredSize.height

  useEffect(() => {
    if (typeof window === 'undefined' || width <= 0 || height <= 0) return

    const precomputed = calculateDisplacementMap(
      glassThickness,
      bezelWidth,
      CONVEX.fn,
      refractiveIndex
    )
    const maxDisplacement = Math.max(
      ...precomputed.map((v) => Math.abs(v)),
      1
    )

    const displacementMap = calculateDisplacementMap2(
      width,
      height,
      width,
      height,
      radius,
      bezelWidth,
      maxDisplacement,
      precomputed
    )

    const specularLayer = calculateRefractionSpecular(
      width,
      height,
      radius,
      bezelWidth,
      specularAngle
    )

    setDisplacementDataUrl(imageDataToUrl(displacementMap))
    setSpecularDataUrl(imageDataToUrl(specularLayer))
    setScale(maxDisplacement * scaleRatio)
  }, [
    width,
    height,
    radius,
    bezelWidth,
    glassThickness,
    refractiveIndex,
    scaleRatio,
    specularAngle,
  ])

  const filterContent = useMemo(() => {
    if (!displacementDataUrl || !specularDataUrl || scale <= 0) return null

    return (
      <>
        {/* 1. 先对 backdrop 做轻微模糊（kube 用 stdDeviation 0.2-1） */}
        <feGaussianBlur
          in="SourceGraphic"
          stdDeviation={blur}
          result="blurred_source"
        />
        {/* 2. 位移图折射 */}
        <feImage
          href={displacementDataUrl}
          x={0}
          y={0}
          width={width}
          height={height}
          result="displacement_map"
        />
        <feDisplacementMap
          in="blurred_source"
          in2="displacement_map"
          scale={scale}
          xChannelSelector="R"
          yChannelSelector="G"
          result="displaced"
        />
        {/* 3. 饱和度增强 */}
        <feColorMatrix
          in="displaced"
          type="saturate"
          values={String(specularSaturation)}
          result="displaced_saturated"
        />
        {/* 4. 高光层：screen 模式叠加边缘光 */}
        <feImage
          href={specularDataUrl}
          x={0}
          y={0}
          width={width}
          height={height}
          result="specular_layer"
        />
        <feComponentTransfer in="specular_layer" result="specular_faded">
          <feFuncA type="linear" slope={specularOpacity} />
        </feComponentTransfer>
        <feBlend
          in="displaced_saturated"
          in2="specular_faded"
          mode="screen"
        />
      </>
    )
  }, [
    displacementDataUrl,
    specularDataUrl,
    scale,
    specularOpacity,
    specularSaturation,
    blur,
    width,
    height,
  ])

  const backdropFilterValue =
    displacementDataUrl && specularDataUrl && scale > 0
      ? `url(#${filterId}) saturate(${backdropSaturation})`
      : `blur(8px) saturate(${backdropSaturation})`

  return (
    <>
      <svg
        width="0"
        height="0"
        aria-hidden
        className="absolute pointer-events-none"
      >
        <filter
          id={filterId}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          {filterContent ?? (
            <feGaussianBlur in="SourceGraphic" stdDeviation={blur / 2} />
          )}
        </filter>
      </svg>
      <div
        ref={containerRef}
        style={{
          backdropFilter: backdropFilterValue,
          WebkitBackdropFilter: backdropFilterValue,
        }}
        className={className ? `relative overflow-hidden ${className}` : 'relative overflow-hidden'}
      >
        {children}
      </div>
    </>
  )
}
