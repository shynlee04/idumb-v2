/**
 * Settings CRUD server functions.
 *
 * Provides key-value persistence via Drizzle ORM + SQLite.
 * Consumed by: settings UI (Phase 7), workspace config (Phase 6+).
 *
 * Functions:
 * - getSettingFn    — Read a single setting by key
 * - setSettingFn    — Create or update a setting
 * - getAllSettingsFn — List all settings
 * - deleteSettingFn — Remove a setting by key
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db/index.server'
import { settings } from '@/db/schema'
import type { SettingsEntry } from '@/shared/ide-types'

// ─── Zod Validators ────────────────────────────────────────────────────────

const SettingsKeySchema = z.object({
  key: z.string().min(1, 'Setting key is required'),
})

const SettingsSetSchema = z.object({
  key: z.string().min(1, 'Setting key is required'),
  value: z.string().min(1, 'Setting value is required'),
})

// ─── Server Functions ──────────────────────────────────────────────────────

/** Get a single setting by key. Returns null if not found. */
export const getSettingFn = createServerFn({ method: 'GET' })
  .inputValidator(SettingsKeySchema)
  .handler(async ({ data }): Promise<SettingsEntry | null> => {
    const row = db
      .select()
      .from(settings)
      .where(eq(settings.key, data.key))
      .get()

    if (!row) return null
    return { key: row.key, value: row.value, updatedAt: row.updatedAt ?? null }
  })

/** Create or update a setting (upsert). */
export const setSettingFn = createServerFn({ method: 'POST' })
  .inputValidator(SettingsSetSchema)
  .handler(async ({ data }): Promise<SettingsEntry> => {
    const now = new Date()
    db.insert(settings)
      .values({ key: data.key, value: data.value, updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: data.value, updatedAt: now },
      })
      .run()

    return { key: data.key, value: data.value, updatedAt: now ?? null }
  })

/** List all settings. */
export const getAllSettingsFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<SettingsEntry[]> => {
    const rows = db.select().from(settings).all()
    return rows.map((r) => ({ key: r.key, value: r.value, updatedAt: r.updatedAt ?? null }))
  })

/** Delete a setting by key. */
export const deleteSettingFn = createServerFn({ method: 'POST' })
  .inputValidator(SettingsKeySchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    db.delete(settings).where(eq(settings.key, data.key)).run()
    return { success: true }
  })
