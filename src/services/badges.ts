// Achievement badges (CLAUDE.md, Statistics section).

export type BadgeKind = 'session' | 'learned' | 'streak' | 'check'

export interface BadgeDef {
  id: string
  kind: BadgeKind
  /** Value of the counter needed: sessions, learned words, streak days, checks */
  threshold: number
}

export const BADGES: readonly BadgeDef[] = [
  { id: 'first-session', kind: 'session', threshold: 1 },
  ...[10, 50, 100, 250, 500, 1000].map((n) => ({ id: `learned-${n}`, kind: 'learned' as const, threshold: n })),
  ...[3, 7, 14, 30, 100].map((n) => ({ id: `streak-${n}`, kind: 'streak' as const, threshold: n })),
  { id: 'first-check', kind: 'check', threshold: 1 },
]

export interface BadgeContext {
  /** Learning sessions finished (reached the summary) */
  sessionsCompleted: number
  /** Words currently learned */
  learnedCount: number
  /** Longest streak ever, in days */
  bestStreak: number
  /** Check sessions finished */
  checksCompleted: number
}

export function badgeValue(kind: BadgeKind, ctx: BadgeContext): number {
  switch (kind) {
    case 'session':
      return ctx.sessionsCompleted
    case 'learned':
      return ctx.learnedCount
    case 'streak':
      return ctx.bestStreak
    case 'check':
      return ctx.checksCompleted
  }
}

export function isEarned(def: BadgeDef, ctx: BadgeContext): boolean {
  return badgeValue(def.kind, ctx) >= def.threshold
}

/** Badges whose condition is met now but which were not awarded before (in list order). */
export function newlyEarned(ctx: BadgeContext, alreadyEarned: ReadonlySet<string>): BadgeDef[] {
  return BADGES.filter((b) => !alreadyEarned.has(b.id) && isEarned(b, ctx))
}

/** Progress towards a badge, 0..1 (for unearned badges). */
export function badgeProgress(def: BadgeDef, ctx: BadgeContext): number {
  return Math.min(1, badgeValue(def.kind, ctx) / def.threshold)
}

// --- IndexedDB ---

export const SESSIONS_COMPLETED_KEY = 'sessionsCompleted'
export const CHECKS_COMPLETED_KEY = 'checksCompleted'

export async function loadBadgeContext(): Promise<BadgeContext> {
  const { db, getSetting } = await import('@/db')
  const { computeStreak } = await import('./streak')
  const { localDateKey } = await import('./date')
  const [learnedCount, activity, sessionsCompleted, checksCompleted] = await Promise.all([
    db.progress.where('status').equals('learned').count(),
    db.activity.toArray(),
    getSetting<number>(SESSIONS_COMPLETED_KEY, 0),
    getSetting<number>(CHECKS_COMPLETED_KEY, 0),
  ])
  const streak = computeStreak(
    activity.filter((a) => a.answered > 0).map((a) => a.date),
    localDateKey(),
  )
  return { sessionsCompleted, learnedCount, bestStreak: streak.best, checksCompleted }
}

/** Award every badge whose condition is met; returns the ones awarded just now. */
export async function awardBadges(now = Date.now()): Promise<BadgeDef[]> {
  const { db } = await import('@/db')
  const ctx = await loadBadgeContext()
  const earned = new Set(await db.badges.toCollection().primaryKeys())
  const fresh = newlyEarned(ctx, earned)
  if (fresh.length) await db.badges.bulkPut(fresh.map((b) => ({ id: b.id, earnedAt: now })))
  return fresh
}

/** A session reached its summary: count it and award badges. */
export async function completeSession(mode: 'learn' | 'check'): Promise<BadgeDef[]> {
  const { getSetting, setSetting } = await import('@/db')
  const key = mode === 'check' ? CHECKS_COMPLETED_KEY : SESSIONS_COMPLETED_KEY
  await setSetting(key, (await getSetting<number>(key, 0)) + 1)
  return awardBadges()
}
