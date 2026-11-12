import Dexie, { type EntityTable } from 'dexie'
import type { ActivityRecord, BadgeRecord, ProgressRecord, SettingRecord } from '@/types'

export class WordCardsDB extends Dexie {
  progress!: EntityTable<ProgressRecord, 'wordId'>
  activity!: EntityTable<ActivityRecord, 'date'>
  settings!: EntityTable<SettingRecord, 'key'>
  badges!: EntityTable<BadgeRecord, 'id'>

  constructor() {
    super('wordcards')
    this.version(1).stores({
      progress: 'wordId, status, level, category, [status+level], lastCheckedAt, updatedAt',
      activity: 'date',
      settings: 'key',
      badges: 'id',
    })
  }
}

export const db = new WordCardsDB()

/** Ask the browser not to evict our data (best effort; iOS may ignore it). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true
      return await navigator.storage.persist()
    }
  } catch {
    // ignore: persistence is optional
  }
  return false
}

/** IDs of every word the user has answered (learned or on review). */
export async function getSeenIds(): Promise<Set<string>> {
  return new Set(await db.progress.toCollection().primaryKeys())
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row === undefined ? fallback : (row.value as T)
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}
