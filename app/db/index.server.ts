import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { existsSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import * as schema from './schema'

const DB_PATH = '.idumb/data/idumb.db'

// Ensure directory exists
const dbDir = dirname(DB_PATH)
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true })
}

const sqlite = new Database(DB_PATH)

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL')

export const db = drizzle({ client: sqlite, schema })

// Run migrations on startup — idempotent (tracks applied migrations in __drizzle_migrations table)
// The drizzle/ folder is relative to the project root (where package.json lives), not app/
try {
  migrate(db, { migrationsFolder: resolve(import.meta.dirname, '../../drizzle') })
} catch (e) {
  // Log to stderr (not console.log which breaks TUI) — migration failures are non-fatal
  // since the app can still function with SDK-only features
  process.stderr.write(`[idumb] Drizzle migration warning: ${e instanceof Error ? e.message : String(e)}\n`)
}
