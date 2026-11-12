// "My words" screen: search, counts and manual moves between the two lists.
import type { ProgressRecord, WordStatus } from '@/types'

/** Lowercase, unify apostrophes (’ ʼ ` → ') and collapse spaces. */
export function normalizeQuery(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘ʼ`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Matches the English word, any of its forms, or any Ukrainian translation. */
export function matchesQuery(r: ProgressRecord, query: string): boolean {
  const q = normalizeQuery(query)
  if (!q) return true
  const haystack = [r.word, ...(r.forms ?? []), ...r.translation]
  return haystack.some((s) => normalizeQuery(s).includes(q))
}

/** Words of one list matching the query, most recently changed first. */
export function filterWords(records: readonly ProgressRecord[], status: WordStatus, query = ''): ProgressRecord[] {
  return records
    .filter((r) => r.status === status && matchesQuery(r, query))
    .sort((a, b) => b.updatedAt - a.updatedAt || a.word.localeCompare(b.word))
}

export function countByStatus(records: readonly ProgressRecord[]): Record<WordStatus, number> {
  const counts: Record<WordStatus, number> = { learned: 0, review: 0 }
  for (const r of records) counts[r.status]++
  return counts
}

export function otherStatus(s: WordStatus): WordStatus {
  return s === 'learned' ? 'review' : 'learned'
}

/** Manual move to the other list. Counters stay; it is not an answer. */
export function moveRecord(r: ProgressRecord, now: number): ProgressRecord {
  return {
    ...r,
    forms: r.forms ? [r.forms[0], r.forms[1], r.forms[2]] : null,
    translation: [...r.translation],
    status: otherStatus(r.status),
    updatedAt: now,
  }
}

// --- IndexedDB ---

export async function loadAllProgress(): Promise<ProgressRecord[]> {
  const { db } = await import('@/db')
  return db.progress.toArray()
}

/** Write a record as is (used for a move and for undo, which restores the previous record). */
export async function saveProgress(r: ProgressRecord): Promise<void> {
  const { db } = await import('@/db')
  // plain copy: IndexedDB cannot store reactive proxies
  await db.progress.put(JSON.parse(JSON.stringify(r)))
}
