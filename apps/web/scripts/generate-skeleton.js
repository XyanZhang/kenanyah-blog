#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const appRoot = path.resolve(__dirname, '..')
const generatedDir = path.join(appRoot, 'src', 'components', 'skeletons', 'generated')

function getPlaywright() {
  return require('@playwright/test')
}

function resolveBrowserPath(explicitPath) {
  if (explicitPath && fs.existsSync(explicitPath)) {
    return explicitPath
  }

  const candidates = [
    process.env.SKELETON_BROWSER_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ].filter(Boolean)

  return candidates.find((candidate) => fs.existsSync(candidate)) || null
}

function getViewports() {
  const { devices } = getPlaywright()

  return {
    desktop: { width: 1440, height: 1200 },
    tablet: { width: 1024, height: 1180 },
    mobile: devices['iPhone 13']?.viewport || { width: 390, height: 844 },
  }
}

function printHelp() {
  console.log(`
Usage:
  pnpm --filter web skeleton:generate --route /about

Options:
  --route <path>         Route to capture, e.g. /about
  --name <Component>     Component name, default derived from route
  --selector <css>       Root selector to capture, default: main
  --output <path>        Output file path relative to apps/web
  --base-url <url>       App base URL, default: http://localhost:3000
  --browser-path <path>  Use an installed browser binary instead of Playwright Chromium
  --viewport <preset>    desktop | tablet | mobile, default: desktop
  --wait-for <css>       Wait until this selector is visible before capture
  --settle-ms <ms>       Extra wait after load, default: 1200
  --capture-factor <n>   Capture height in viewport multiples, default: 1.25
  --max-shapes <n>       Max generated shapes, default: 72
  --min-size <px>        Ignore smaller elements, default: 8

Hints:
  data-skeleton="ignore"   Skip an element subtree
  data-skeleton="text"     Force text-line placeholders
  data-skeleton="block"    Force a block placeholder
  data-skeleton="circle"   Force a circular placeholder
  data-skeleton="surface"  Force a container surface placeholder
`)
}

function parseArgs(argv) {
  const options = {}

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      options[key] = true
      continue
    }
    options[key] = next
    i += 1
  }

  return options
}

function toPascalCase(value) {
  return value
    .replace(/(^\/+|\/+$)/g, '')
    .split(/[\/\-_]+/)
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('')
}

function deriveComponentName(route) {
  const base = toPascalCase(route) || 'Page'
  return `${base}SkeletonGenerated`
}

function ensureTsxSuffix(filePath) {
  return filePath.endsWith('.tsx') ? filePath : `${filePath}.tsx`
}

function resolveOutputPath(options, componentName) {
  if (options.output) {
    return ensureTsxSuffix(path.resolve(appRoot, options.output))
  }
  return path.join(generatedDir, `${componentName}.tsx`)
}

function formatNumber(value) {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(2).replace(/\.?0+$/, '')
}

async function ensureBaseUrlReachable(baseUrl) {
  try {
    const res = await fetch(baseUrl, {
      method: 'GET',
      redirect: 'manual',
    })
    return res.ok || res.status === 307 || res.status === 308 || res.status === 404
  } catch {
    return false
  }
}

async function waitForReady(page, options) {
  if (options['wait-for']) {
    await page.waitForSelector(options['wait-for'], {
      state: 'visible',
      timeout: 15000,
    })
  }

  await page.waitForLoadState('load', { timeout: 5000 }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {})

  await page
    .waitForFunction(() => !document.querySelector('[aria-busy="true"]'), {
      timeout: 3000,
    })
    .catch(() => {})

  await page.waitForTimeout(Number(options['settle-ms'] || 1200))
}

function buildSource({
  command,
  componentName,
  frame,
  shapes,
  route,
  selector,
  viewport,
}) {
  const frameLines = [
    `  tag: '${frame.tag}',`,
    `  width: ${formatNumber(frame.width)},`,
    `  height: ${formatNumber(frame.height)},`,
    `  paddingTop: ${formatNumber(frame.paddingTop)},`,
    `  paddingRight: ${formatNumber(frame.paddingRight)},`,
    `  paddingBottom: ${formatNumber(frame.paddingBottom)},`,
    `  paddingLeft: ${formatNumber(frame.paddingLeft)},`,
    `  centered: ${frame.centered ? 'true' : 'false'},`,
  ]

  const shapeLines = shapes.map(
    (shape) =>
      `  { id: '${shape.id}', kind: '${shape.kind}', x: ${formatNumber(shape.x)}, y: ${formatNumber(shape.y)}, width: ${formatNumber(shape.width)}, height: ${formatNumber(shape.height)}, radius: ${formatNumber(shape.radius)}, opacity: ${formatNumber(shape.opacity)} },`
  )

  return `import {
  GeneratedSkeletonScene,
  type GeneratedSkeletonFrame,
  type GeneratedSkeletonShape,
} from '@/components/skeletons/GeneratedSkeletonScene'

/**
 * Auto-generated by \`${command}\`
 * Route: ${route}
 * Selector: ${selector}
 * Viewport: ${viewport.width}x${viewport.height}
 *
 * Use data-skeleton hints on the page when you want to refine the next generation pass.
 */

const frame: GeneratedSkeletonFrame = {
${frameLines.join('\n')}
}

const shapes: GeneratedSkeletonShape[] = [
${shapeLines.join('\n')}
]

export default function ${componentName}() {
  return <GeneratedSkeletonScene frame={frame} shapes={shapes} />
}
`
}

async function captureLayout(page, selector, options) {
  return page.evaluate(
    ({ selector: rootSelector, minSize, maxShapes, captureFactor }) => {
      const root = document.querySelector(rootSelector)
      if (!root) {
        throw new Error(`Selector not found: ${rootSelector}`)
      }

      const rootRect = root.getBoundingClientRect()
      if (!rootRect.width || !rootRect.height) {
        throw new Error(`Selector has no visible box: ${rootSelector}`)
      }

      const visibleHeight = Math.min(rootRect.height, window.innerHeight * captureFactor)
      const captureTop = rootRect.top
      const captureBottom = rootRect.top + visibleHeight
      const rootArea = rootRect.width * visibleHeight
      const shapes = []
      const textTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'label', 'time', 'strong', 'em', 'small', 'li'])
      const mediaTags = new Set(['img', 'svg', 'video', 'canvas', 'picture'])
      const interactiveTags = new Set(['button', 'input', 'textarea', 'select'])

      function parseAlpha(color) {
        if (!color || color === 'transparent') return 0
        const match = color.match(/rgba?\(([^)]+)\)/)
        if (!match) return 1
        const parts = match[1].split(',').map((part) => part.trim())
        if (parts.length < 4) return 1
        const alpha = Number(parts[3])
        return Number.isFinite(alpha) ? alpha : 1
      }

      function hasVisibleBackground(style) {
        return parseAlpha(style.backgroundColor) > 0.04
      }

      function hasVisibleBorder(style) {
        const borderWidth = Number.parseFloat(style.borderTopWidth || '0')
        if (!Number.isFinite(borderWidth) || borderWidth <= 0) return false
        return parseAlpha(style.borderTopColor) > 0.04
      }

      function getRadius(style, rect, forceCircle = false) {
        if (forceCircle) return 9999
        const radius = Number.parseFloat(style.borderTopLeftRadius || '0')
        if (Number.isFinite(radius) && radius > 0) {
          return Math.min(radius, Math.min(rect.width, rect.height) / 2)
        }
        return Math.min(16, rect.height / 3)
      }

      function isVisible(style, rect) {
        if (!rect.width || !rect.height) return false
        if (rect.bottom <= captureTop || rect.top >= captureBottom) return false
        if (style.display === 'none' || style.visibility === 'hidden') return false
        if (Number(style.opacity) <= 0.05) return false
        return true
      }

      function toShape(kind, rect, style, extra = {}) {
        const top = Math.max(rect.top, captureTop)
        const bottom = Math.min(rect.bottom, captureBottom)
        const height = bottom - top
        if (rect.width < minSize || height < minSize) return null

        return {
          id: `${kind}-${shapes.length + 1}`,
          kind,
          left: rect.left - rootRect.left,
          top: top - rootRect.top,
          width: rect.width,
          height,
          radius: getRadius(style, rect, kind === 'circle'),
          opacity: extra.opacity ?? 1,
        }
      }

      function createTextShapes(rect, style, tag) {
        const fontSize = Number.parseFloat(style.fontSize || '14') || 14
        const lineHeight = Number.parseFloat(style.lineHeight || String(fontSize * 1.45)) || fontSize * 1.45
        let lineCount = Math.round(rect.height / Math.max(lineHeight, fontSize))
        const isLongForm = tag === 'p' || tag === 'li'
        lineCount = Math.max(1, Math.min(isLongForm ? 4 : 2, lineCount || 1))

        const barHeight = Math.max(8, Math.min(18, fontSize * 0.82))
        const gap = Math.max(6, barHeight * 0.55)
        const totalHeight = lineCount * barHeight + Math.max(0, lineCount - 1) * gap
        const availableHeight = Math.min(rect.height, totalHeight)
        const startOffset = Math.max(0, (rect.height - availableHeight) / 2)

        return Array.from({ length: lineCount }, (_, index) => {
          const widthFactor =
            lineCount === 1 ? 0.92 : index === lineCount - 1 ? 0.72 : index % 2 === 0 ? 0.96 : 0.88
          const textRect = {
            left: rect.left,
            top: rect.top + startOffset + index * (barHeight + gap),
            width: rect.width * widthFactor,
            height: barHeight,
            bottom: rect.top + startOffset + index * (barHeight + gap) + barHeight,
            right: rect.left + rect.width * widthFactor,
          }

          return toShape('line', textRect, style, { opacity: 0.95 })
        }).filter(Boolean)
      }

      function hasOnlyInlineChildren(element) {
        return Array.from(element.children).every((child) => {
          if (!(child instanceof HTMLElement || child instanceof SVGElement)) return true
          const display = window.getComputedStyle(child).display
          return display.startsWith('inline') || child.tagName.toLowerCase() === 'br'
        })
      }

      function isTextLike(element, tag) {
        if (!textTags.has(tag)) return false
        const text = (element.textContent || '').replace(/\s+/g, ' ').trim()
        if (!text) return false
        if (element.children.length === 0) return true
        return hasOnlyInlineChildren(element)
      }

      function isInteractive(element, tag) {
        return interactiveTags.has(tag) || element.getAttribute('role') === 'button'
      }

      function captureSurface(element, rect, style) {
        const area = rect.width * rect.height
        if (area < minSize * minSize * 6) return null
        if (area > rootArea * 0.55) return null
        if (rect.width > rootRect.width * 0.98 && rect.height > visibleHeight * 0.5) return null
        return toShape('surface', rect, style, { opacity: 0.7 })
      }

      function traverse(element) {
        for (const child of Array.from(element.children)) {
          if (!(child instanceof HTMLElement || child instanceof SVGElement)) continue

          const hint = (child.getAttribute('data-skeleton') || '')
            .split(/[\s,]+/)
            .filter(Boolean)
          if (hint.includes('ignore')) continue

          const tag = child.tagName.toLowerCase()
          const style = window.getComputedStyle(child)
          const rect = child.getBoundingClientRect()

          if (!isVisible(style, rect)) continue

          let skipChildren = false
          let nextShapes = []

          if (hint.includes('circle')) {
            const shape = toShape('circle', rect, style, { opacity: 0.9 })
            if (shape) nextShapes.push(shape)
            skipChildren = true
          } else if (hint.includes('block')) {
            const shape = toShape('block', rect, style, { opacity: 0.9 })
            if (shape) nextShapes.push(shape)
            skipChildren = true
          } else if (hint.includes('surface')) {
            const shape = toShape('surface', rect, style, { opacity: 0.7 })
            if (shape) nextShapes.push(shape)
          } else if (hint.includes('text')) {
            nextShapes = createTextShapes(rect, style, tag)
            skipChildren = true
          } else if (mediaTags.has(tag)) {
            const nearSquare = Math.abs(rect.width - rect.height) <= Math.min(rect.width, rect.height) * 0.16
            const shape = toShape(nearSquare ? 'circle' : 'block', rect, style, { opacity: 0.92 })
            if (shape) nextShapes.push(shape)
            skipChildren = true
          } else if (isInteractive(child, tag)) {
            const shape = toShape('block', rect, style, { opacity: 0.9 })
            if (shape) nextShapes.push(shape)
            skipChildren = true
          } else if (isTextLike(child, tag)) {
            nextShapes = createTextShapes(rect, style, tag)
            skipChildren = true
          } else if (
            hasVisibleBackground(style) ||
            hasVisibleBorder(style) ||
            style.boxShadow !== 'none'
          ) {
            const surface = captureSurface(child, rect, style)
            if (surface) nextShapes.push(surface)
          }

          for (const shape of nextShapes) {
            shapes.push(shape)
          }

          if (!skipChildren) {
            traverse(child)
          }
        }
      }

      traverse(root)

      if (shapes.length === 0) {
        throw new Error(`No visible shapes detected under selector: ${rootSelector}`)
      }

      shapes.sort((a, b) => {
        const priority = { surface: 0, block: 1, circle: 1, line: 2 }
        return (
          priority[a.kind] - priority[b.kind] ||
          a.top - b.top ||
          a.left - b.left ||
          b.width * b.height - a.width * a.height
        )
      })

      const limitedShapes = shapes.slice(0, maxShapes)
      const bounds = limitedShapes.reduce(
        (acc, shape) => ({
          left: Math.min(acc.left, shape.left),
          top: Math.min(acc.top, shape.top),
          right: Math.max(acc.right, shape.left + shape.width),
          bottom: Math.max(acc.bottom, shape.top + shape.height),
        }),
        {
          left: Number.POSITIVE_INFINITY,
          top: Number.POSITIVE_INFINITY,
          right: 0,
          bottom: 0,
        }
      )

      const trimPadding = 8
      const croppedLeft = Math.max(0, bounds.left - trimPadding)
      const croppedTop = Math.max(0, bounds.top - trimPadding)
      const croppedRight = Math.min(rootRect.width, bounds.right + trimPadding)
      const croppedBottom = Math.min(visibleHeight, bounds.bottom + trimPadding)
      const croppedWidth = Math.max(minSize, croppedRight - croppedLeft)
      const croppedHeight = Math.max(minSize, croppedBottom - croppedTop)
      const leftGap = croppedLeft
      const rightGap = Math.max(0, rootRect.width - croppedRight)
      const centered = Math.abs(leftGap - rightGap) <= 32

      const normalizedShapes = limitedShapes.map((shape, index) => ({
        id: `${shape.kind}-${index + 1}`,
        kind: shape.kind,
        x: ((shape.left - croppedLeft) / croppedWidth) * 100,
        y: ((shape.top - croppedTop) / croppedHeight) * 100,
        width: (shape.width / croppedWidth) * 100,
        height: (shape.height / croppedHeight) * 100,
        radius: shape.radius,
        opacity: shape.opacity,
      }))

      return {
        frame: {
          tag: root.tagName.toLowerCase() === 'main' ? 'main' : 'div',
          width: croppedWidth,
          height: croppedHeight,
          paddingTop: croppedTop,
          paddingRight: centered ? Math.min(24, leftGap, rightGap) : Math.min(24, rightGap),
          paddingBottom: Math.max(0, visibleHeight - croppedBottom),
          paddingLeft: centered ? Math.min(24, leftGap, rightGap) : Math.min(24, leftGap),
          centered,
        },
        shapes: normalizedShapes,
      }
    },
    {
      selector,
      minSize: Number(options['min-size'] || 8),
      maxShapes: Number(options['max-shapes'] || 72),
      captureFactor: Number(options['capture-factor'] || 1.25),
    }
  )
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help || options.h) {
    printHelp()
    return
  }

  const route = options.route
  if (!route) {
    printHelp()
    process.exitCode = 1
    return
  }

  const { chromium } = getPlaywright()
  const viewports = getViewports()
  const viewport = viewports[options.viewport || 'desktop'] || viewports.desktop
  const baseUrl = options['base-url'] || 'http://localhost:3000'
  const browserPath = resolveBrowserPath(options['browser-path'])
  const selector = options.selector || 'main'
  const componentName = options.name || deriveComponentName(route)
  const outputPath = resolveOutputPath(options, componentName)
  const command = `pnpm --filter web skeleton:generate ${process.argv.slice(2).join(' ')}`

  const reachable = await ensureBaseUrlReachable(baseUrl)
  if (!reachable) {
    console.error(`[skeleton] Cannot reach ${baseUrl}`)
    console.error('[skeleton] Start the app first with `pnpm dev:blog` or `pnpm dev`.')
    process.exitCode = 1
    return
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: browserPath || undefined,
  })
  const page = await browser.newPage({ viewport })

  try {
    const targetUrl = new URL(route, baseUrl).toString()
    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    })
    await waitForReady(page, options)

    const { frame, shapes } = await captureLayout(page, selector, options)
    const source = buildSource({
      command,
      componentName,
      frame,
      shapes,
      route,
      selector,
      viewport,
    })

    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, source, 'utf8')

    console.log(`[skeleton] Generated ${path.relative(appRoot, outputPath)}`)
    console.log(`[skeleton] Shapes: ${shapes.length}`)
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error('[skeleton] Generation failed')
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
