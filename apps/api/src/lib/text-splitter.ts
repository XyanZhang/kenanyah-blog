import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

export type SplitOptions = {
  targetLen: number
  maxLen: number
  overlap: number
  minLen?: number
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * 基于 LangChain RecursiveCharacterTextSplitter 的切分。
 */
export async function splitTextForRag(text: string, opts: SplitOptions): Promise<string[]> {
  const targetLen = clamp(opts.targetLen, 200, 5000)
  const maxLen = clamp(opts.maxLen, targetLen, 8000)
  const overlap = clamp(opts.overlap, 0, Math.floor(maxLen / 2))
  const minLen = clamp(opts.minLen ?? 200, 0, targetLen)

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: targetLen,
    chunkOverlap: overlap,
    separators: [
      '\n\n',
      '。', '！', '？', '；',
      '.', '!', '?', ';',
      '，', ',', '、',
      '',
    ],
  })

  const rawChunks = await splitter.splitText(text)
  const normalized = rawChunks.map((c) => c.trim()).filter(Boolean)

  const bounded: string[] = []
  for (const c of normalized) {
    if (c.length <= maxLen) bounded.push(c)
    else {
      for (let i = 0; i < c.length; i += maxLen) {
        const part = c.slice(i, i + maxLen).trim()
        if (part) bounded.push(part)
      }
    }
  }

  return bounded.length <= 1 ? bounded : bounded.filter((c) => c.length >= minLen)
}

