export type PdfCleanReport = {
  originalLength: number
  cleanedLength: number
  removedLineCount: number
  removedByReason: {
    repeatedLine: number
    dotLeaders: number
    pageNumber: number
    empty: number
  }
  topRepeatedSamples: Array<{ line: string; count: number }>
}

function normalizeLineForFreq(line: string): string {
  return line
    .replace(/\s+/g, ' ')
    .replace(/[‐‑–—]/g, '-') // 常见连字符
    .trim()
}

function isDotLeaderLine(line: string): boolean {
  // 目录点线：中文/英文里常见 "..... 12" 或 "…… 12"
  const s = line.trim()
  if (!s) return false
  if (/^[\.\u2026\u22ef·•]{4,}\s*\d+\s*$/.test(s)) return true
  if (/^.{1,40}[\.\u2026\u22ef·•]{4,}\s*\d+\s*$/.test(s)) return true
  return false
}

function isPageNumberLine(line: string): boolean {
  const s = line.trim()
  if (!s) return false
  // 纯页码 / "Page 12" / "第 12 页"
  if (/^\d{1,4}$/.test(s)) return true
  if (/^page\s*\d{1,4}\s*$/i.test(s)) return true
  if (/^第?\s*\d{1,4}\s*页$/.test(s)) return true
  return false
}

/**
 * 合并 PDF 排版导致的“软换行”（保留双换行作为段落边界）：
 * - 将单个换行（非空行）合并为空格
 * - 避免把一句话切成多行，影响 chunk 语义自洽
 */
export function mergeSoftLineBreaks(text: string): string {
  const t = text.replace(/\r/g, '')
  // 先规范化：把超多空行压到最多 2 行
  const normalized = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
  // 合并单换行：把 “非换行” + "\n" + “非换行” 变成空格连接
  const merged = normalized.replace(/([^\n])\n(?!\n)/g, '$1 ')
  // 再次压缩空白
  return merged.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

/** 去除文本中的空格/制表等空白（保留换行，用于段落边界）。 */
export function removeSpacesKeepNewlines(text: string): string {
  return text.replace(/[ \t\u00A0\u2000-\u200B\u3000]+/g, '')
}

/**
 * PDF 文本清洗（不依赖页信息的 baseline）：
 * - 规范化换行与空白
 * - 去目录点线、纯页码
 * - 去高频重复行（常见页眉页脚/水印），按全文行频统计
 */
export function cleanPdfText(rawText: string): { text: string; report: PdfCleanReport } {
  const originalLength = rawText.length
  const normalized = rawText.replace(/\r/g, '').trim()
  const lines = normalized.split('\n')

  const freq = new Map<string, number>()
  for (const line of lines) {
    const key = normalizeLineForFreq(line)
    if (!key) continue
    freq.set(key, (freq.get(key) ?? 0) + 1)
  }

  // 高频重复行阈值：按文本长度自适应，避免小文档误删
  const minFreq = Math.max(4, Math.floor(lines.length / 30)) // 约每 30 行出现一次即认为重复
  const maxLineLenForRemoval = 80

  const removedByReason = {
    repeatedLine: 0,
    dotLeaders: 0,
    pageNumber: 0,
    empty: 0,
  }

  const kept: string[] = []
  let removedLineCount = 0
  for (const line of lines) {
    const key = normalizeLineForFreq(line)
    const trimmed = key
    if (!trimmed) {
      // 空行不作为噪声删除：保留为段落边界，后续再压缩连续空行
      kept.push('')
      continue
    }
    if (isDotLeaderLine(trimmed)) {
      removedLineCount++
      removedByReason.dotLeaders++
      continue
    }
    if (isPageNumberLine(trimmed)) {
      removedLineCount++
      removedByReason.pageNumber++
      continue
    }
    const count = freq.get(trimmed) ?? 0
    if (count >= minFreq && trimmed.length <= maxLineLenForRemoval) {
      removedLineCount++
      removedByReason.repeatedLine++
      continue
    }
    kept.push(trimmed)
  }

  // 压缩连续空行（最多保留一个空行，用于段落分隔）
  const compact: string[] = []
  let lastEmpty = false
  for (const line of kept) {
    const isEmpty = line.length === 0
    if (isEmpty) {
      if (lastEmpty) continue
      compact.push('')
      lastEmpty = true
    } else {
      compact.push(line)
      lastEmpty = false
    }
  }

  const text = compact.join('\n').replace(/\n{3,}/g, '\n\n').trim()

  const topRepeatedSamples = [...freq.entries()]
    .filter(([line, count]) => count >= minFreq && line.length <= maxLineLenForRemoval)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([line, count]) => ({ line, count }))

  return {
    text,
    report: {
      originalLength,
      cleanedLength: text.length,
      removedLineCount,
      removedByReason,
      topRepeatedSamples,
    },
  }
}

