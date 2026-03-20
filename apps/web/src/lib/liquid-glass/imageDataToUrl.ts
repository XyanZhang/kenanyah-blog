/**
 * 将 ImageData 转为 data URL，用于 SVG feImage
 * 仅在浏览器环境可用
 */

export function imageDataToUrl(imageData: ImageData): string {
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL()
}
