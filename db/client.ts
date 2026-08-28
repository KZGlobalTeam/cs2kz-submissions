import { neon, neonConfig, Pool } from '@neondatabase/serverless'
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePool } from 'drizzle-orm/neon-serverless'
import type { NeonTransaction } from 'drizzle-orm/neon-serverless'
import type { ExtractTablesWithRelations } from 'drizzle-orm/relations'

import { getAppConfig } from '~/server/utils/config'

import * as schema from './schema'

// The Neon WebSocket transport needs a WebSocket constructor on Cloudflare
// Workers (it is not global by default in the Workers runtime).
if (!neonConfig.webSocketConstructor && typeof globalThis.WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = globalThis.WebSocket
}

function resolveDatabaseUrl() {
  const { databaseUrl } = getAppConfig()
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured')
  }
  return databaseUrl
}

// Stateless HTTP driver used for all regular queries. `neon()` issues a fresh
// `fetch()` per query and holds no I/O objects, so the cached instance is safe
// to reuse across Cloudflare Workers requests. (A WebSocket `Pool` singleton
// is NOT safe there: its connections cannot outlive the request that created
// them — see `withTransaction` below for the transaction path.)
function createHttpDatabase() {
  return drizzleHttp({ client: neon(resolveDatabaseUrl()), schema })
}

let httpDatabase: ReturnType<typeof createHttpDatabase> | null = null

export function useDb() {
  if (httpDatabase) {
    return httpDatabase
  }

  httpDatabase = createHttpDatabase()
  return httpDatabase
}

// Builds a short-lived WebSocket `Pool` for a single interactive transaction.
// Cloudflare Workers forbid reusing I/O objects (WebSocket connections) across
// requests, so the `neon-http` driver is used for everything except
// transactions, and transactions get a `Pool` that is created AND closed
// within this one call — never cached, never shared with another request.
function createPoolDatabase() {
  const pool = new Pool({ connectionString: resolveDatabaseUrl(), max: 1 })
  return { db: drizzlePool({ client: pool, schema }), pool }
}

export type TransactionClient = NeonTransaction<
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>

export async function withTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  const { db, pool } = createPoolDatabase()
  try {
    return await db.transaction(fn)
  }
  finally {
    await pool.end()
  }
}
