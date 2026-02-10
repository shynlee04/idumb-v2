import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

/**
 * Settings — key-value store for app preferences, UI state, model config.
 * Consumed by: settings server functions (Phase 5), settings UI (Phase 7).
 */
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})

/**
 * Workspace Config — per-project metadata for multi-project support.
 * Consumed by: workspace switching (Phase 6+).
 */
export const workspaceConfig = sqliteTable('workspace_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectDir: text('project_dir').notNull().unique(),
  name: text('name'),
  lastOpened: integer('last_opened', { mode: 'timestamp' }),
  config: text('config'), // JSON blob — parsed by server functions
})
