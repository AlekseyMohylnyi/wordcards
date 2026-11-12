// Development only: fill IndexedDB with believable data to check the Stats screen.
// Imported dynamically behind `import.meta.env.DEV`, so it is not part of the production build.
import type { ActivityRecord, ProgressRecord } from '@/types'
import { addDays, localDateKey, parseDateKey } from './date'
import { loadLevel } from './wordSource'
import { CHECKS_COMPLETED_KEY, SESSIONS_COMPLETED_KEY } from './badges'
import { LAST_CHECK_KEY } from './review'

/** Deterministic PRNG so the demo looks the same every time */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAY = 86_400_000

export async function fillDemoData(): Promise<void> {
  const { db } = await import('@/db')
  const random = rng(42)
  const today = localDateKey()
  const now = Date.now()

  // ~150 days of activity: gaps in the past, a 16-day record run, and the last 9 days in a row
  const activity: ActivityRecord[] = []
  for (let i = 150; i >= 0; i--) {
    const date = addDays(today, -i)
    const inRecordRun = i >= 60 && i < 76
    const inCurrentRun = i < 9
    if (!inRecordRun && !inCurrentRun && random() < 0.4) continue
    if (i === 9 || i === 76) continue // break the runs explicitly
    const answered = 5 + Math.floor(random() * 40)
    const unknown = Math.floor(answered * (0.15 + random() * 0.25))
    activity.push({ date, answered, known: answered - unknown, unknown, newLearned: Math.floor((answered - unknown) * 0.7) })
  }

  // Progress: 320 learned and 45 on review from A1
  const words = await loadLevel('A1')
  const shuffled = words.slice().sort(() => random() - 0.5)
  const progress: ProgressRecord[] = shuffled.slice(0, 365).map((w, i) => {
    const learned = i < 320
    const seenAt = parseDateKey(addDays(today, -Math.floor(random() * 150))).getTime() + 9 * 3600_000
    return {
      wordId: w.id,
      status: learned ? 'learned' : 'review',
      level: w.level,
      category: w.category,
      word: w.word,
      forms: w.forms,
      translation: [...w.translation],
      firstSeenAt: seenAt,
      updatedAt: seenAt,
      timesKnown: learned ? 1 + Math.floor(random() * 3) : Math.floor(random() * 2),
      timesUnknown: learned ? Math.floor(random() * 2) : 1 + Math.floor(random() * 2),
      lastCheckedAt: learned && random() < 0.3 ? now - Math.floor(random() * 40) * DAY : null,
    }
  })

  await db.transaction('rw', db.progress, db.activity, db.settings, db.badges, async () => {
    await Promise.all([db.progress.clear(), db.activity.clear(), db.badges.clear()])
    await db.activity.bulkPut(activity)
    await db.progress.bulkPut(progress)
    await db.settings.bulkPut([
      { key: SESSIONS_COMPLETED_KEY, value: 42 },
      { key: CHECKS_COMPLETED_KEY, value: 3 },
      { key: LAST_CHECK_KEY, value: now - 10 * DAY },
    ])
    await db.settings.delete('activeSession')
  })
}

/** Remove all learning data (settings like language stay). */
export async function clearLearningData(): Promise<void> {
  const { db } = await import('@/db')
  await db.transaction('rw', db.progress, db.activity, db.settings, db.badges, async () => {
    await Promise.all([db.progress.clear(), db.activity.clear(), db.badges.clear()])
    await db.settings.bulkDelete([SESSIONS_COMPLETED_KEY, CHECKS_COMPLETED_KEY, LAST_CHECK_KEY, 'checkSnoozedUntil', 'activeSession'])
  })
}
