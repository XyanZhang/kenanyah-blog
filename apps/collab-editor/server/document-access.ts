import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { env } from './env'

const scrypt = promisify(scryptCallback)
const PASSWORD_PREFIX = 'scrypt'
const PASSWORD_KEY_LENGTH = 64
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

export type DocumentAccessRecord = {
  id: string
  ownerId: string | null
  passwordHash: string | null
  isShareable: boolean
  shareId: string | null
}

export async function hashDocumentPassword(password: string) {
  const normalized = normalizePassword(password)
  const salt = randomBytes(16).toString('hex')
  const derived = (await scrypt(normalized, salt, PASSWORD_KEY_LENGTH)) as Buffer
  return `${PASSWORD_PREFIX}:${salt}:${derived.toString('hex')}`
}

export async function verifyDocumentPassword(password: string, passwordHash: string | null) {
  if (!passwordHash) return false

  const normalized = normalizePassword(password)
  const [prefix, salt, expectedHex] = passwordHash.split(':')
  if (prefix !== PASSWORD_PREFIX || !salt || !expectedHex) return false

  const expected = Buffer.from(expectedHex, 'hex')
  const actual = (await scrypt(normalized, salt, expected.length)) as Buffer
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function createDocumentAccessToken(document: DocumentAccessRecord) {
  const issuedAt = Date.now()
  const payload = {
    documentId: document.id,
    passwordFingerprint: passwordFingerprint(document.passwordHash),
    issuedAt,
    expiresAt: issuedAt + TOKEN_TTL_MS,
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = signTokenBody(body)
  return `${body}.${signature}`
}

export function verifyDocumentAccessToken(document: DocumentAccessRecord, token: string | null | undefined) {
  if (!document.passwordHash) return true
  if (!token) return false

  const [body, signature] = token.split('.')
  if (!body || !signature || signature !== signTokenBody(body)) return false

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      documentId?: unknown
      passwordFingerprint?: unknown
      expiresAt?: unknown
    }

    return (
      payload.documentId === document.id &&
      payload.passwordFingerprint === passwordFingerprint(document.passwordHash) &&
      typeof payload.expiresAt === 'number' &&
      payload.expiresAt > Date.now()
    )
  } catch {
    return false
  }
}

export function parseCollaborationToken(token: string | null | undefined) {
  if (!token) return { pixelId: null, accessToken: null }
  try {
    const parsed = JSON.parse(token) as { pixelId?: unknown; accessToken?: unknown }
    return {
      pixelId: typeof parsed.pixelId === 'string' ? parsed.pixelId : null,
      accessToken: typeof parsed.accessToken === 'string' ? parsed.accessToken : null,
    }
  } catch {
    return { pixelId: null, accessToken: token }
  }
}

export function canOpenDocument(document: DocumentAccessRecord, pixelId: string | null | undefined) {
  return Boolean(pixelId && document.ownerId && pixelId === document.ownerId) || document.isShareable
}

export function normalizePassword(password: string | undefined) {
  const normalized = password?.trim()
  if (!normalized) throw new Error('密码不能为空')
  if (normalized.length < 4) throw new Error('密码至少 4 位')
  if (normalized.length > 128) throw new Error('密码最多 128 位')
  return normalized
}

function passwordFingerprint(passwordHash: string | null) {
  return createHmac('sha256', tokenSecret()).update(passwordHash ?? 'none').digest('base64url')
}

function signTokenBody(body: string) {
  return createHmac('sha256', tokenSecret()).update(body).digest('base64url')
}

function tokenSecret() {
  return env.accessTokenSecret
}
