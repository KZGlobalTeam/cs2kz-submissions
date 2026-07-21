import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'

import * as schema from './schema'

if (!neonConfig.webSocketConstructor && typeof globalThis.WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = globalThis.WebSocket
}

function createDatabase() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured')
  }

  const pool = new Pool({ connectionString })
  return drizzle({ client: pool, schema })
}

let database: ReturnType<typeof createDatabase> | null = null

export function useDb() {
  if (database) {
    return database
  }

  database = createDatabase()
  return database
}
