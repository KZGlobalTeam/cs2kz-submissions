import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

import * as schema from './schema'

let database: ReturnType<typeof drizzle<typeof schema>> | null = null

export function useDb() {
  if (database) {
    return database
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured')
  }

  const sql = neon(connectionString)
  database = drizzle(sql, { schema })
  return database
}
