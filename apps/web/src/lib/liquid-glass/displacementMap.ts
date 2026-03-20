/**
 * Liquid Glass 位移图计算
 * 基于 Snell 定律的折射，预计算边缘位移量
 * 参考 https://kube.io/blog/liquid-glass-css-svg/
 */

export function calculateDisplacementMap(
  glassThickness: number = 200,
  bezelWidth: number = 50,
  bezelHeightFn: (x: number) => number = (x) => x,
  refractiveIndex: number = 1.5,
  samples: number = 128
): number[] {
  const eta = 1 / refractiveIndex

  function refract(normalX: number, normalY: number): [number, number] | null {
    const dot = normalY
    const k = 1 - eta * eta * (1 - dot * dot)
    if (k < 0) return null
    const kSqrt = Math.sqrt(k)
    return [
      -(eta * dot + kSqrt) * normalX,
      eta - (eta * dot + kSqrt) * normalY,
    ]
  }

  return Array.from({ length: samples }, (_, i) => {
    const x = i / samples
    const y = bezelHeightFn(x)
    const dx = x < 1 ? 0.0001 : -0.0001
    const y2 = bezelHeightFn(x + dx)
    const derivative = (y2 - y) / dx
    const magnitude = Math.sqrt(derivative * derivative + 1)
    const normal = [-derivative / magnitude, -1 / magnitude]
    const refracted = refract(normal[0], normal[1])

    if (!refracted) return 0
    const remainingHeightOnBezel = y * bezelWidth
    const remainingHeight = remainingHeightOnBezel + glassThickness
    return refracted[0] * (remainingHeight / refracted[1])
  })
}

/** 将预计算的位移量转为整张位移图 RGBA 图像 */
export function calculateDisplacementMap2(
  canvasWidth: number,
  canvasHeight: number,
  objectWidth: number,
  objectHeight: number,
  radius: number,
  bezelWidth: number,
  maximumDisplacement: number,
  precomputedDisplacementMap: number[],
  dpr?: number
): ImageData {
  const devicePixelRatio =
    dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio ?? 1 : 1)
  const bufferWidth = Math.round(canvasWidth * devicePixelRatio)
  const bufferHeight = Math.round(canvasHeight * devicePixelRatio)

  const imageData = new ImageData(bufferWidth, bufferHeight)
  const data = imageData.data
  const neutral = 0x80 // 128 = no displacement

  for (let i = 0; i < data.length; i += 4) {
    data[i] = neutral
    data[i + 1] = neutral
    data[i + 2] = 128
    data[i + 3] = 255
  }

  const radius_ = radius * devicePixelRatio
  const bezel = bezelWidth * devicePixelRatio
  const radiusSquared = radius_ ** 2
  const radiusPlusOneSquared = (radius_ + 1) ** 2
  const radiusMinusBezelSquared = (radius_ - bezel) ** 2

  const objectWidth_ = objectWidth * devicePixelRatio
  const objectHeight_ = objectHeight * devicePixelRatio
  const widthBetweenRadiuses = objectWidth_ - radius_ * 2
  const heightBetweenRadiuses = objectHeight_ - radius_ * 2

  const objectX = Math.round((bufferWidth - objectWidth_) / 2)
  const objectY = Math.round((bufferHeight - objectHeight_) / 2)

  for (let y1 = 0; y1 < objectHeight_; y1++) {
    for (let x1 = 0; x1 < objectWidth_; x1++) {
      const idx = ((objectY + y1) * bufferWidth + objectX + x1) * 4

      const isOnLeftSide = x1 < radius_
      const isOnRightSide = x1 >= objectWidth_ - radius_
      const isOnTopSide = y1 < radius_
      const isOnBottomSide = y1 >= objectHeight_ - radius_

      const x = isOnLeftSide
        ? x1 - radius_
        : isOnRightSide
          ? x1 - radius_ - widthBetweenRadiuses
          : 0

      const y = isOnTopSide
        ? y1 - radius_
        : isOnBottomSide
          ? y1 - radius_ - heightBetweenRadiuses
          : 0

      const distanceToCenterSquared = x * x + y * y

      const isInBezel =
        distanceToCenterSquared <= radiusPlusOneSquared &&
        distanceToCenterSquared >= radiusMinusBezelSquared

      if (isInBezel) {
        const opacity =
          distanceToCenterSquared < radiusSquared
            ? 1
            : 1 -
              (Math.sqrt(distanceToCenterSquared) - Math.sqrt(radiusSquared)) /
                (Math.sqrt(radiusPlusOneSquared) - Math.sqrt(radiusSquared))

        const distanceFromCenter = Math.sqrt(distanceToCenterSquared)
        const distanceFromSide = radius_ - distanceFromCenter

        const cos = x / distanceFromCenter
        const sin = y / distanceFromCenter

        const bezelIndex =
          ((distanceFromSide / bezel) * precomputedDisplacementMap.length) | 0
        const distance = precomputedDisplacementMap[bezelIndex] ?? 0

        const dX = (-cos * distance) / maximumDisplacement
        const dY = (-sin * distance) / maximumDisplacement

        data[idx] = 128 + dX * 127 * opacity
        data[idx + 1] = 128 + dY * 127 * opacity
        data[idx + 2] = 128
        data[idx + 3] = 255
      }
    }
  }
  return imageData
}
