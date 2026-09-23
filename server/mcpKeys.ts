import crypto from 'node:crypto'
import { nanoid } from 'nanoid'
import { and, desc, eq } from 'drizzle-orm'
import { db } from './db/index.ts'
import { mcpApiKeys } from './db/schema.ts'
import { isBanned } from './auth.ts'

export interface McpKeySummary {
  id: string
  name: string
  prefix: string
  createdAt: number
  lastUsedAt: number | null
  expiresAt: number | null
}

export interface CreatedMcpKey extends McpKeySummary {
  token: string
}

export function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

/**
 * Creates a personal access token for connecting MCP clients without interactive OAuth.
 * The raw token (starting with `doop_pat_`) is returned once and never stored unhashed.
 */
export async function createMcpKey(userId: string, name: string, expiresInDays?: number): Promise<CreatedMcpKey> {
  const trimmedName = name.trim().slice(0, 60) || 'MCP Access Token'
  const id = nanoid(10)
  const entropy = crypto.randomBytes(24).toString('base64url')
  const token = `doop_pat_${entropy}`
  const keyHash = hashKey(token)
  const prefix = token.slice(0, 17) + '...'
  const now = Date.now()
  const expiresAt = expiresInDays && expiresInDays > 0 ? now + expiresInDays * 24 * 60 * 60 * 1000 : null

  await db.insert(mcpApiKeys).values({
    id,
    userId,
    name: trimmedName,
    keyHash,
    prefix,
    createdAt: now,
    lastUsedAt: null,
    expiresAt,
  })

  return {
    id,
    name: trimmedName,
    prefix,
    token,
    createdAt: now,
    lastUsedAt: null,
    expiresAt,
  }
}

/** List all active tokens belonging to a user (excludes hashes/raw secrets). */
export async function listMcpKeys(userId: string): Promise<McpKeySummary[]> {
  const rows = await db
    .select({
      id: mcpApiKeys.id,
      name: mcpApiKeys.name,
      prefix: mcpApiKeys.prefix,
      createdAt: mcpApiKeys.createdAt,
      lastUsedAt: mcpApiKeys.lastUsedAt,
      expiresAt: mcpApiKeys.expiresAt,
    })
    .from(mcpApiKeys)
    .where(eq(mcpApiKeys.userId, userId))
    .orderBy(desc(mcpApiKeys.createdAt))

  return rows
}

/** Revoke/delete a specific token. */
export async function revokeMcpKey(userId: string, id: string): Promise<boolean> {
  const result = await db
    .delete(mcpApiKeys)
    .where(and(eq(mcpApiKeys.id, id), eq(mcpApiKeys.userId, userId)))
    .returning({ id: mcpApiKeys.id })

  return result.length > 0
}

/**
 * Validates a raw bearer token. Returns user info if valid, null otherwise.
 * Rejects expired tokens and banned users. Asynchronously updates lastUsedAt.
 */
export async function verifyMcpKey(rawKey: string): Promise<{ userId: string; keyId: string } | null> {
  const trimmed = rawKey.trim()
  if (!trimmed.startsWith('doop_pat_')) return null

  const keyHash = hashKey(trimmed)
  const [row] = await db
    .select({
      id: mcpApiKeys.id,
      userId: mcpApiKeys.userId,
      expiresAt: mcpApiKeys.expiresAt,
    })
    .from(mcpApiKeys)
    .where(eq(mcpApiKeys.keyHash, keyHash))

  if (!row) return null

  // Check expiration if set
  if (row.expiresAt && Date.now() > row.expiresAt) {
    return null
  }

  // Check if user is banned
  if (await isBanned(row.userId)) {
    return null
  }

  // Asynchronously bump lastUsedAt
  void db
    .update(mcpApiKeys)
    .set({ lastUsedAt: Date.now() })
    .where(eq(mcpApiKeys.id, row.id))
    .catch((err) => console.error('Failed to update lastUsedAt on mcpKey', err))

  return { userId: row.userId, keyId: row.id }
}
