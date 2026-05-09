import path from 'node:path'
import {
  indexZiweiSource,
  parseZiweiPdfFile,
  upsertZiweiSourceAndChunks,
  ZIWEI_SOURCE_ID,
} from '../src/lib/ziwei-knowledge'
import { prisma } from '../src/lib/db'

async function main() {
  const pdfPathArg = process.argv[2]
  if (!pdfPathArg) {
    throw new Error('请传入《紫微斗数全书》PDF 路径，例如：pnpm --filter @blog/api run import-ziwei ./紫微斗数全书.pdf')
  }

  const pdfPath = path.resolve(pdfPathArg)
  const chunks = await parseZiweiPdfFile(pdfPath)
  const source = await upsertZiweiSourceAndChunks({
    sourceId: ZIWEI_SOURCE_ID,
    title: '《紫微斗数全书》',
    description: '从《紫微斗数全书》PDF 导入，用于紫微斗数学习、资料检索和后续命理实验室引用。',
    chunks,
  })

  console.log(`[ziwei] imported ${source.chunkCount} chunks into ${source.sourceId}`)

  const indexed = await indexZiweiSource(source.sourceId)
  console.log(
    `[ziwei] indexed ${indexed.embeddedCount} changed chunks, skipped ${indexed.skippedCount}, total ${indexed.chunkCount}`
  )
}

main()
  .catch((error) => {
    console.error('[ziwei] import failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
