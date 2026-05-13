import { Pool } from 'pg'
import { env } from './env'
import type {
  CollaborativeDocumentFolder,
  CollaborativeDocumentSummary,
  CollaborativeEditorUser,
  CreateFolderInput,
  CreateDocumentInput,
  UpdateUserInput,
  UpdateDocumentInput,
  UpdateFolderInput,
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

const userColors = ['#c24162', '#2f6f73', '#8b5e34', '#5b6c9d', '#8f4c38', '#486b42', '#7a5b92', '#b35c24']

export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "collaborative_documents" (
      "id" TEXT PRIMARY KEY,
      "slug" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "folderPath" TEXT NOT NULL DEFAULT '',
      "ownerId" TEXT,
      "summary" TEXT,
      "snapshotJson" TEXT,
      "lastEditedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  await pool.query(`
    ALTER TABLE "collaborative_documents"
      ADD COLUMN IF NOT EXISTS "folderPath" TEXT NOT NULL DEFAULT '';
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "collaborative_document_folders" (
      "id" TEXT PRIMARY KEY,
      "path" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "parentPath" TEXT NOT NULL DEFAULT '',
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "collaborative_editor_users" (
      "pixelId" TEXT PRIMARY KEY,
      "nickname" TEXT,
      "color" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  await pool.query(
    'CREATE INDEX IF NOT EXISTS "collaborative_documents_ownerId_idx" ON "collaborative_documents"("ownerId");'
  )
  await pool.query(
    'CREATE INDEX IF NOT EXISTS "collaborative_documents_folderPath_idx" ON "collaborative_documents"("folderPath");'
  )
  await pool.query(
    'CREATE INDEX IF NOT EXISTS "collaborative_documents_lastEditedAt_idx" ON "collaborative_documents"("lastEditedAt");'
  )
  await pool.query(
    'CREATE INDEX IF NOT EXISTS "collaborative_document_folders_parentPath_idx" ON "collaborative_document_folders"("parentPath");'
  )
  await pool.query(
    'CREATE INDEX IF NOT EXISTS "collaborative_editor_users_updatedAt_idx" ON "collaborative_editor_users"("updatedAt");'
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
      "folderPath",
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
    `SELECT "id", "slug", "title", "folderPath", "summary", "lastEditedAt", "createdAt", "updatedAt"
     FROM "collaborative_documents"
     WHERE "id" = $1`,
    [documentId]
  )

  return result.rows[0] ? mapDocumentRow(result.rows[0]) : null
}

export async function createDocument(input: CreateDocumentInput): Promise<CollaborativeDocumentSummary> {
  const title = normalizeTitle(input.title)
  const folderPath = normalizeFolderPath(input.folderPath)
  assertValidFolderPath(folderPath)
  if (folderPath) await ensureFolderAncestors(folderPath)
  const slug = await createUniqueSlug(title)
  const result = await pool.query(
    `INSERT INTO "collaborative_documents" ("id", "slug", "title", "folderPath", "summary", "lastEditedAt")
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     RETURNING "id", "slug", "title", "folderPath", "summary", "lastEditedAt", "createdAt", "updatedAt"`,
    [crypto.randomUUID(), slug, title, folderPath, '新的协同文档，打开后即可多人同时编辑。']
  )

  return mapDocumentRow(result.rows[0])
}

export async function updateDocument(
  documentId: string,
  input: UpdateDocumentInput
): Promise<CollaborativeDocumentSummary | null> {
  const current = await getDocument(documentId)
  if (!current) return null

  const title = typeof input.title === 'undefined' ? current.title : normalizeTitle(input.title)
  const folderPath =
    typeof input.folderPath === 'undefined'
      ? current.folderPath
      : normalizeFolderPath(input.folderPath)
  assertValidFolderPath(folderPath)
  if (folderPath) await ensureFolderAncestors(folderPath)

  const result = await pool.query(
    `UPDATE "collaborative_documents"
     SET "title" = $2, "folderPath" = $3, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $1
     RETURNING "id", "slug", "title", "folderPath", "summary", "lastEditedAt", "createdAt", "updatedAt"`,
    [documentId, title, folderPath]
  )

  return result.rows[0] ? mapDocumentRow(result.rows[0]) : null
}

export async function getOrCreateEditorUser(pixelIdInput: string): Promise<CollaborativeEditorUser> {
  const pixelId = normalizePixelId(pixelIdInput)
  const existing = await pool.query(
    `SELECT "pixelId", "nickname", "color", "createdAt", "updatedAt"
     FROM "collaborative_editor_users"
     WHERE "pixelId" = $1`,
    [pixelId]
  )
  if (existing.rows[0]) return mapEditorUserRow(existing.rows[0])

  const result = await pool.query(
    `INSERT INTO "collaborative_editor_users" ("pixelId", "color")
     VALUES ($1, $2)
     RETURNING "pixelId", "nickname", "color", "createdAt", "updatedAt"`,
    [pixelId, colorForPixelId(pixelId)]
  )

  return mapEditorUserRow(result.rows[0])
}

export async function updateEditorUser(
  pixelIdInput: string,
  input: UpdateUserInput
): Promise<CollaborativeEditorUser> {
  const current = await getOrCreateEditorUser(pixelIdInput)
  const nickname =
    typeof input.nickname === 'undefined'
      ? current.nickname
      : normalizeNickname(input.nickname)
  const color = typeof input.color === 'undefined' ? current.color : normalizeColor(input.color)

  const result = await pool.query(
    `UPDATE "collaborative_editor_users"
     SET "nickname" = $2, "color" = $3, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "pixelId" = $1
     RETURNING "pixelId", "nickname", "color", "createdAt", "updatedAt"`,
    [current.pixelId, nickname, color]
  )

  return mapEditorUserRow(result.rows[0])
}

export async function listFolders(): Promise<CollaborativeDocumentFolder[]> {
  const result = await pool.query(`
    SELECT "id", "path", "name", "parentPath", "createdAt", "updatedAt"
    FROM "collaborative_document_folders"
    ORDER BY "parentPath" ASC, "name" ASC
  `)

  return result.rows.map(mapFolderRow)
}

export async function createFolder(input: CreateFolderInput): Promise<CollaborativeDocumentFolder> {
  const folderPath = normalizeFolderPath(input.path)
  if (!folderPath) throw new Error('目录名称不能为空')
  assertValidFolderPath(folderPath)
  await ensureFolderAncestors(folderPath)

  const result = await pool.query(
    `SELECT "id", "path", "name", "parentPath", "createdAt", "updatedAt"
     FROM "collaborative_document_folders"
     WHERE "path" = $1`,
    [folderPath]
  )

  return mapFolderRow(result.rows[0])
}

export async function deleteFolder(folderPathInput: string): Promise<boolean> {
  const folderPath = normalizeFolderPath(folderPathInput)
  if (!folderPath) throw new Error('目录路径不能为空')

  const usage = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM "collaborative_document_folders" WHERE "parentPath" = $1) AS "childFolders",
       (SELECT COUNT(*)::int FROM "collaborative_documents" WHERE "folderPath" = $1) AS "documents"`,
    [folderPath]
  )
  const childFolders = Number(usage.rows[0]?.childFolders ?? 0)
  const documents = Number(usage.rows[0]?.documents ?? 0)
  if (childFolders > 0 || documents > 0) {
    throw new Error('请先清空目录中的子目录和文档')
  }

  const result = await pool.query(
    `DELETE FROM "collaborative_document_folders" WHERE "path" = $1`,
    [folderPath]
  )
  return (result.rowCount ?? 0) > 0
}

export async function renameFolder(
  folderPathInput: string,
  input: UpdateFolderInput
): Promise<CollaborativeDocumentFolder | null> {
  const folderPath = normalizeFolderPath(folderPathInput)
  if (!folderPath) throw new Error('目录路径不能为空')

  const name = normalizeFolderName(input.name)
  assertValidFolderPath(name)

  const parentPath = parentPathOf(folderPath)
  const nextPath = [parentPath, name].filter(Boolean).join('/')
  assertValidFolderPath(nextPath)
  if (folderPath === nextPath) {
    const current = await getFolder(folderPath)
    return current
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const current = await client.query(
      `SELECT "id", "path", "name", "parentPath", "createdAt", "updatedAt"
       FROM "collaborative_document_folders"
       WHERE "path" = $1
       FOR UPDATE`,
      [folderPath]
    )
    if (!current.rows[0]) {
      await client.query('ROLLBACK')
      return null
    }

    const conflict = await client.query(
      `SELECT 1 FROM "collaborative_document_folders" WHERE "path" = $1 LIMIT 1`,
      [nextPath]
    )
    if ((conflict.rowCount ?? 0) > 0) throw new Error('同级目录已存在这个名称')

    await client.query(
      `UPDATE "collaborative_document_folders"
       SET
         "path" = $2 || substring("path" from $3),
         "parentPath" = CASE
           WHEN "parentPath" = $1 THEN $2
           WHEN "parentPath" LIKE $4 THEN $2 || substring("parentPath" from $3)
           ELSE "parentPath"
         END,
         "name" = CASE WHEN "path" = $1 THEN $5 ELSE "name" END,
         "updatedAt" = CURRENT_TIMESTAMP
       WHERE "path" = $1 OR "path" LIKE $4`,
      [folderPath, nextPath, folderPath.length + 1, `${folderPath}/%`, name]
    )

    await client.query(
      `UPDATE "collaborative_documents"
       SET
         "folderPath" = CASE
           WHEN "folderPath" = $1 THEN $2
           WHEN "folderPath" LIKE $4 THEN $2 || substring("folderPath" from $3)
           ELSE "folderPath"
         END,
         "updatedAt" = CURRENT_TIMESTAMP
       WHERE "folderPath" = $1 OR "folderPath" LIKE $4`,
      [folderPath, nextPath, folderPath.length + 1, `${folderPath}/%`]
    )

    const renamed = await client.query(
      `SELECT "id", "path", "name", "parentPath", "createdAt", "updatedAt"
       FROM "collaborative_document_folders"
       WHERE "path" = $1`,
      [nextPath]
    )

    await client.query('COMMIT')
    return renamed.rows[0] ? mapFolderRow(renamed.rows[0]) : null
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
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

function normalizePixelId(value: string | undefined) {
  const pixelId = value?.trim()
  if (!pixelId) throw new Error('像素 id 不能为空')
  if (pixelId.length > 96) throw new Error('像素 id 过长')
  if (!/^[a-zA-Z0-9_-]+$/.test(pixelId)) throw new Error('像素 id 格式不合法')
  return pixelId
}

function normalizeNickname(value: string | undefined) {
  const nickname = value?.trim().replace(/\s+/g, ' ')
  if (!nickname) throw new Error('昵称不能为空')
  if (nickname.length > 24) throw new Error('昵称最多 24 个字符')
  return nickname
}

function normalizeColor(value: string | undefined) {
  const color = value?.trim()
  if (!color) throw new Error('颜色不能为空')
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error('颜色格式不合法')
  return color.toLowerCase()
}

function colorForPixelId(pixelId: string) {
  let hash = 0
  for (const char of pixelId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return userColors[hash % userColors.length]
}

function normalizeFolderPath(value: string | undefined) {
  return (value ?? '')
    .split('/')
    .map((segment) => segment.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .join('/')
}

function normalizeFolderName(value: string | undefined) {
  const name = normalizeFolderPath(value).split('/').at(-1) ?? ''
  if (!name) throw new Error('目录名称不能为空')
  return name
}

function parentPathOf(folderPath: string) {
  const parts = folderPath.split('/').filter(Boolean)
  parts.pop()
  return parts.join('/')
}

async function getFolder(folderPath: string): Promise<CollaborativeDocumentFolder | null> {
  const result = await pool.query(
    `SELECT "id", "path", "name", "parentPath", "createdAt", "updatedAt"
     FROM "collaborative_document_folders"
     WHERE "path" = $1`,
    [folderPath]
  )

  return result.rows[0] ? mapFolderRow(result.rows[0]) : null
}

function assertValidFolderPath(folderPath: string) {
  if (folderPath.length > 240) throw new Error('目录路径过长')
  const segments = folderPath.split('/').filter(Boolean)
  if (segments.length > 8) throw new Error('目录层级最多支持 8 级')
  if (segments.some((segment) => segment.length > 60)) {
    throw new Error('单级目录名称最多 60 个字符')
  }
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error('目录名称不合法')
  }
  if (segments.some((segment) => /[<>:"\\|?*\x00-\x1F]/.test(segment))) {
    throw new Error('目录名称不能包含特殊字符')
  }
}

async function ensureFolderAncestors(folderPath: string) {
  const parts = folderPath.split('/').filter(Boolean)
  let currentPath = ''

  for (const part of parts) {
    const parentPath = currentPath
    currentPath = currentPath ? `${currentPath}/${part}` : part
    await pool.query(
      `INSERT INTO "collaborative_document_folders" ("id", "path", "name", "parentPath")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("path") DO UPDATE
       SET "name" = EXCLUDED."name",
           "parentPath" = EXCLUDED."parentPath",
           "updatedAt" = CURRENT_TIMESTAMP`,
      [crypto.randomUUID(), currentPath, part, parentPath]
    )
  }
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
    folderPath: row.folderPath ? String(row.folderPath) : '',
    summary: row.summary ? String(row.summary) : null,
    lastEditedAt: toIso(row.lastEditedAt),
    createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(row.updatedAt) ?? new Date().toISOString(),
  }
}

function mapFolderRow(row: Record<string, unknown>): CollaborativeDocumentFolder {
  return {
    id: String(row.id),
    path: String(row.path),
    name: String(row.name),
    parentPath: row.parentPath ? String(row.parentPath) : '',
    createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(row.updatedAt) ?? new Date().toISOString(),
  }
}

function mapEditorUserRow(row: Record<string, unknown>): CollaborativeEditorUser {
  return {
    pixelId: String(row.pixelId),
    nickname: row.nickname ? String(row.nickname) : null,
    color: String(row.color),
    createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(row.updatedAt) ?? new Date().toISOString(),
  }
}

function toIso(value: unknown) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString()
}
