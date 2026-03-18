import fs from 'node:fs/promises'
import path from 'node:path'

// 解析 PDF 文本。优先使用 LangChain PDFLoader（后续会加依赖），当前先用 pdf-parse。
// 为了让整体链路尽快跑通，这里用动态 import，避免在依赖未安装时直接崩。
export async function extractPdfText(filePath: string): Promise<{ text: string; numpages?: number }> {
  const buffer = await fs.readFile(filePath)

  try {
    const pdfParse = (await import('pdf-parse')).default as unknown as (buf: Buffer) => Promise<{
      text: string
      numpages: number
    }>
    const parsed = await pdfParse(buffer)
    return { text: parsed.text ?? '', numpages: parsed.numpages }
  } catch (err) {
    const name = path.basename(filePath)
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`PDF 解析失败（${name}）：${msg}`)
  }
}

