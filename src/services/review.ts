// Rule 10: periodic check of learned words.
import type { Level, ProgressRecord, Word } from '@/types'
import type { SessionPlan } from './wordSource'
import { addToActivity } from './answers'
import { localDateKey } from './date'

export const CHECK_MIN_LEARNED = 20
export const CHECK_INTERVAL_DAYS = 7
export const CHECK_SNOOZE_DAYS = 2
const DAY_MS = 86_400_000

/** Settings keys */
export const LAST_CHECK_KEY = 'lastCheckAt'
export const CHECK_SNOOZE_KEY = 'checkSnoozedUntil'
export const DEV_FORCE_CHECK_KEY = 'devForceCheckBanner'

export interface CheckBannerInput {
  learnedCount: number
  /** Time of the last answer given in a check session, or null if never checked */
  lastCheckAt: number | null
  /** "Later" was pressed: hide until this time */
  snoozedUntil: number | null
  now: number
  /** Dev switch: always show */
  force?: boolean
}

/** Show "Check your learned words" when ≥ 20 learned and ≥ 7 days since the last check (or never), unless snoozed. */
export function shouldShowCheckBanner(i: CheckBannerInput): boolean {
  if (i.force) return true
  if (i.learnedCount < CHECK_MIN_LEARNED) return false
  if (i.snoozedUntil !== null && i.now < i.snoozedUntil) return false
  return i.lastCheckAt === null || i.now - i.lastCheckAt >= CHECK_INTERVAL_DAYS * DAY_MS
}

/** "Later" hides the banner for 2 days. */
export function snoozeUntil(now: number): number {
  return now + CHECK_SNOOZE_DAYS * DAY_MS
}

/** Learned words only; never checked first, then the longest-ago checked; ties: learned earliest. */
export function pickCheckRecords(records: readonly ProgressRecord[], size: number): ProgressRecord[] {
  const key = (r: ProgressRecord) => r.lastCheckedAt ?? Number.NEGATIVE_INFINITY
  return records
    .filter((r) => r.status === 'learned')
    .slice()
    .sort((a, b) => {
      const ka = key(a)
      const kb = key(b)
      if (ka !== kb) return ka < kb ? -1 : 1
      return a.updatedAt - b.updatedAt
    })
    .slice(0, size)
}

/** Check answer: "know" keeps it learned and stamps lastCheckedAt; "don't know" sends it to review. */
export function applyCheckAnswer(existing: ProgressRecord, known: boolean, now: number): ProgressRecord {
  return {
    ...existing,
    forms: existing.forms ? [existing.forms[0], existing.forms[1], existing.forms[2]] : null,
    translation: [...existing.translation],
    status: known ? 'learned' : 'review',
    lastCheckedAt: now,
    updatedAt: now,
    timesKnown: existing.timesKnown + (known ? 1 : 0),
    timesUnknown: existing.timesUnknown + (known ? 0 : 1),
  }
}

/** Resolve progress records to full words (they may be from any level). Removed words are skipped. */
export async function resolveWords(records: readonly ProgressRecord[], loadLevel: (l: Level) => Promise<Word[]>): Promise<Word[]> {
  const levels = [...new Set(records.map((r) => r.level))]
  const lists = await Promise.all(levels.map((l) => loadLevel(l).catch(() => [] as Word[])))
  const byId = new Map(lists.flat().map((w) => [w.id, w]))
  return records.map((r) => byId.get(r.wordId)).filter((w): w is Word => !!w)
}

export interface CheckDeps {
  loadLevel: (level: Level) => Promise<Word[]>
  getLearned: () => Promise<ProgressRecord[]>
}

/** A check session: up to `size` learned words in "oldest checked first" order. */
export async function buildCheckSession(size: number, deps: CheckDeps): Promise<SessionPlan> {
  const picked = pickCheckRecords(await deps.getLearned(), size)
  const words = await resolveWords(picked, deps.loadLevel)
  return {
    cards: words.map((word) => ({ word, isReview: false })),
    newWanted: 0,
    newAvailable: 0,
    reviewCount: 0,
    exhausted: false,
  }
}

// --- IndexedDB ---

export interface CheckBannerState {
  show: boolean
  /** Cards a check session would contain */
  count: number
}

export async function loadCheckBannerState(sessionSize: number, now = Date.now()): Promise<CheckBannerState> {
  const { db, getSetting } = await import('@/db')
  const [learnedCount, lastCheckAt, snoozedUntil, force] = await Promise.all([
    db.progress.where('status').equals('learned').count(),
    getSetting<number | null>(LAST_CHECK_KEY, null),
    getSetting<number | null>(CHECK_SNOOZE_KEY, null),
    import.meta.env.DEV ? getSetting<boolean>(DEV_FORCE_CHECK_KEY, false) : Promise.resolve(false),
  ])
  return {
    show: shouldShowCheckBanner({ learnedCount, lastCheckAt, snoozedUntil, now, force }),
    count: Math.min(learnedCount, sessionSize),
  }
}

export async function snoozeCheckBanner(now = Date.now()): Promise<void> {
  const { setSetting } = await import('@/db')
  await setSetting(CHECK_SNOOZE_KEY, snoozeUntil(now))
}

export async function loadLearnedRecords(): Promise<ProgressRecord[]> {
  const { db } = await import('@/db')
  return db.progress.where('status').equals('learned').toArray()
}

/** Save a check answer: progress, today's activity and the last-check time, in one transaction. */
export async function recordCheckAnswer(word: Word, known: boolean, now: Date = new Date()): Promise<void> {
  const { db } = await import('@/db')
  const date = localDateKey(now)
  const t = now.getTime()
  await db.transaction('rw', db.progress, db.activity, db.settings, async () => {
    const existing = await db.progress.get(word.id)
    if (existing) await db.progress.put(applyCheckAnswer(existing, known, t))
    await db.activity.put(addToActivity(await db.activity.get(date), date, known, false))
    await db.settings.put({ key: LAST_CHECK_KEY, value: t })
  })
}
