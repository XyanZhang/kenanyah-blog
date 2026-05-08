import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  indexYijingSource,
  parseYijingText,
  upsertYijingSourceAndChunks,
  YIJING_SOURCE_ID,
} from '../src/lib/yijing-knowledge'
import { prisma } from '../src/lib/db'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..', '..')
const defaultTextPath = path.join(repoRoot, '易经.txt')

async function main() {
  const textPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultTextPath
  const rawText = await fs.readFile(textPath, 'utf8')
  const chunks = await parseYijingText(rawText)

  const source = await upsertYijingSourceAndChunks({
    title: '《易经》全文',
    description: '从项目根目录 易经.txt 导入，用于易经学习 Agent 的原文检索与解释。',
    chunks,
  })

  console.log(`[yijing] imported ${source.chunkCount} chunks into ${source.sourceId}`)

  const indexed = await indexYijingSource(YIJING_SOURCE_ID)
  console.log(
    `[yijing] indexed ${indexed.embeddedCount} changed chunks, skipped ${indexed.skippedCount}, total ${indexed.chunkCount}`
  )
}

main()
  .catch((error) => {
    console.error('[yijing] import failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
