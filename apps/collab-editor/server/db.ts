import { Pool } from 'pg'
import { env } from './env'
import type {
  CollaborativeDocumentSummary,
  CreateDocumentInput,
  UpdateDocumentInput,
} from './types'

export const pool = new Pool({
  connectionString: env.databaseUrl,
})

const sampleDocuments = [
  {
    title: '协同方案草稿',
    slug: 'collab-plan',
    summary: '用于演示多人一起梳理需求、记录任务和同步编辑状态。',
  },
  {
    title: '产品会议纪要',
    slug: 'meeting-notes',
    summary: '模拟会议中多人同时补充议题、结论和待办事项。',
  },
  {
    title: '研究资料整理',
    slug: 'research-board',
    summary: '适合展示块级文档在长资料整理中的编辑体验。',
  },
]

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "collaborative_documents" (
      "id" TEXT PRIMARY KEY,
      "slug" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "ownerId" TEXT,
      "summary" TEXT,
      "snapshotJson" TEXT,
      "lastEditedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "collaborative_document_states" (
      "documentId" TEXT PRIMARY KEY,
      "ydoc" BYTEA NOT NULL,
      "version" INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "collaborative_document_states_documentId_fkey"
        FOREIGN KEY ("documentId") REFERENCES "collaborative_documents"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    );
  `)

  await pool.query(
    'CREATE INDEX IF NOT EXISTS "collaborative_documents_ownerId_idx" ON "collaborative_documents"("ownerId");'
  )
  await pool.query(
    'CREATE INDEX IF NOT EXISTS "collaborative_documents_lastEditedAt_idx" ON "collaborative_documents"("lastEditedAt");'
  )
}

export async function seedSampleDocuments() {
  for (const doc of sampleDocuments) {
    await pool.query(
      `INSERT INTO "collaborative_documents" ("id", "slug", "title", "summary", "lastEditedAt")
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT ("slug") DO NOTHING`,
      [crypto.randomUUID(), doc.slug, doc.title, doc.summary]
    )
  }
}

export async function listDocuments(): Promise<CollaborativeDocumentSummary[]> {
  const result = await pool.query(`
    SELECT
      "id",
      "slug",
      "title",
      "summary",
      "lastEditedAt",
      "createdAt",
      "updatedAt"
    FROM "collaborative_documents"
    ORDER BY COALESCE("lastEditedAt", "updatedAt", "createdAt") DESC
  `)

  return result.rows.map(mapDocumentRow)
}

export async function getDocument(documentId: string): Promise<CollaborativeDocumentSummary | null> {
  const result = await pool.query(
    `SELECT "id", "slug", "title", "summary", "lastEditedAt", "createdAt", "updatedAt"
     FROM "collaborative_documents"
     WHERE "id" = $1`,
    [documentId]
  )

  return result.rows[0] ? mapDocumentRow(result.rows[0]) : null
}

export async function createDocument(input: CreateDocumentInput): Promise<CollaborativeDocumentSummary> {
  const title = normalizeTitle(input.title)
  const slug = await createUniqueSlug(title)
  const result = await pool.query(
    `INSERT INTO "collaborative_documents" ("id", "slug", "title", "summary", "lastEditedAt")
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     RETURNING "id", "slug", "title", "summary", "lastEditedAt", "createdAt", "updatedAt"`,
    [crypto.randomUUID(), slug, title, '新的协同文档，打开后即可多人同时编辑。']
  )

  return mapDocumentRow(result.rows[0])
}

export async function updateDocument(
  documentId: string,
  input: UpdateDocumentInput
): Promise<CollaborativeDocumentSummary | null> {
  const title = normalizeTitle(input.title)
  const result = await pool.query(
    `UPDATE "collaborative_documents"
     SET "title" = $2, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $1
     RETURNING "id", "slug", "title", "summary", "lastEditedAt", "createdAt", "updatedAt"`,
    [documentId, title]
  )

  return result.rows[0] ? mapDocumentRow(result.rows[0]) : null
}

export async function loadDocumentState(documentId: string): Promise<Buffer | null> {
  const result = await pool.query(
    `SELECT "ydoc" FROM "collaborative_document_states" WHERE "documentId" = $1`,
    [documentId]
  )

  return result.rows[0]?.ydoc ?? null
}

export async function storeDocumentState(documentId: string, state: Uint8Array) {
  await pool.query(
    `INSERT INTO "collaborative_document_states" ("documentId", "ydoc")
     VALUES ($1, $2)
     ON CONFLICT ("documentId") DO UPDATE
       SET "ydoc" = EXCLUDED."ydoc",
           "version" = "collaborative_document_states"."version" + 1,
           "updatedAt" = CURRENT_TIMESTAMP`,
    [documentId, Buffer.from(state)]
  )

  await pool.query(
    `UPDATE "collaborative_documents"
     SET "lastEditedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $1`,
    [documentId]
  )
}

function normalizeTitle(title: string | undefined) {
  const trimmed = title?.trim()
  return trimmed ? trimmed.slice(0, 80) : '未命名文档'
}

async function createUniqueSlug(title: string) {
  const base = slugify(title) || 'doc'

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`
    const candidate = `${base}${suffix}`
    const result = await pool.query(
      'SELECT 1 FROM "collaborative_documents" WHERE "slug" = $1 LIMIT 1',
      [candidate]
    )
    if (result.rowCount === 0) return candidate
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function mapDocumentRow(row: Record<string, unknown>): CollaborativeDocumentSummary {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    summary: row.summary ? String(row.summary) : null,
    lastEditedAt: toIso(row.lastEditedAt),
    createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(row.updatedAt) ?? new Date().toISOString(),
  }
}

function toIso(value: unknown) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString()
}
