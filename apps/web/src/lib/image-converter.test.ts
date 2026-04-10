import { describe, expect, it } from 'vitest'
import {
  createCropFromPoints,
  createLockedCropFromPoints,
  DEFAULT_CROP,
  fitCropToAspectRatioAroundCenter,
  getCropAspectRatio,
  getCenteredAspectCrop,
  getCropPixels,
  getOutputFilename,
  getCropResizeAnchor,
  lockCropToAspectRatio,
  sanitizeCrop,
  translateCrop,
} from './image-converter'

describe('image-converter utils', () => {
  it('sanitizes crop values into valid bounds', () => {
    expect(sanitizeCrop({ x: 88, y: -4, width: 30, height: 120 })).toEqual({
      x: 70,
      y: 0,
      width: 30,
      height: 100,
    })
  })

  it('creates a centered square crop for landscape images', () => {
    expect(getCenteredAspectCrop(1600, 900, 1)).toEqual({
      x: 21.88,
      y: 0,
      width: 56.25,
      height: 100,
    })
  })

  it('converts percentage crop data into pixel coordinates', () => {
    expect(getCropPixels(1200, 800, { x: 10, y: 20, width: 50, height: 40 })).toEqual({
      x: 120,
      y: 160,
      width: 600,
      height: 320,
    })
  })

  it('derives the correct output filename extension', () => {
    expect(getOutputFilename('hero-banner.png', 'image/webp')).toBe('hero-banner.webp')
    expect(getOutputFilename(' avatar ', 'image/jpeg')).toBe('avatar.jpg')
  })

  it('creates a crop rectangle from any drag direction', () => {
    expect(createCropFromPoints({ x: 80, y: 70 }, { x: 20, y: 10 })).toEqual({
      x: 20,
      y: 10,
      width: 60,
      height: 60,
    })
  })

  it('creates a locked crop that preserves the selected aspect ratio', () => {
    const crop = createLockedCropFromPoints({ x: 10, y: 10 }, { x: 50, y: 70 }, 1600, 900, 1)
    expect(crop).toEqual({
      x: 10,
      y: 10,
      width: 33.75,
      height: 60,
    })
    expect(getCropAspectRatio(crop, 1600, 900)).toBeCloseTo(1, 3)
  })

  it('translates crop positions while respecting image bounds', () => {
    expect(translateCrop({ x: 70, y: 65, width: 30, height: 35 }, 20, 10)).toEqual({
      x: 70,
      y: 65,
      width: 30,
      height: 35,
    })
  })

  it('returns the opposite anchor point for resize handles', () => {
    expect(getCropResizeAnchor({ x: 15, y: 20, width: 25, height: 30 }, 'nw')).toEqual({
      x: 40,
      y: 50,
    })
    expect(getCropResizeAnchor({ x: 15, y: 20, width: 25, height: 30 }, 'se')).toEqual({
      x: 15,
      y: 20,
    })
  })

  it('locks crop size changes to a target aspect ratio', () => {
    const crop = lockCropToAspectRatio({ x: 10, y: 15, width: 60, height: 40 }, 1600, 900, 1, 'width')
    expect(crop.x).toBe(10)
    expect(crop.y).toBe(15)
    expect(crop.width).toBeLessThanOrEqual(90)
    expect(crop.height).toBeLessThanOrEqual(85)
    expect(getCropAspectRatio(crop, 1600, 900)).toBeCloseTo(1, 3)
  })

  it('fits crop around its current center when switching aspect ratios', () => {
    const original = { x: 10, y: 10, width: 60, height: 40 }
    const crop = fitCropToAspectRatioAroundCenter(original, 1600, 900, 16 / 9)
    expect(getCropAspectRatio(crop, 1600, 900)).toBeCloseTo(16 / 9, 4)
    expect(crop.x + crop.width / 2).toBeCloseTo(original.x + original.width / 2, 2)
    expect(crop.y + crop.height / 2).toBeCloseTo(original.y + original.height / 2, 2)
  })

  it('keeps the full-image crop as the default', () => {
    expect(DEFAULT_CROP).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    })
  })
})
