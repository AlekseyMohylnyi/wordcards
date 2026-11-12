import { addDays } from './date'

export interface StreakInfo {
  /** Consecutive days up to today (or up to yesterday if today has no answers yet) */
  current: number
  /** Longest run of consecutive active days ever */
  best: number
  /** Whether today already counts */
  todayDone: boolean
}

/**
 * Compute streaks from the local dates (YYYY-MM-DD) on which the user gave at least one answer.
 * A streak stays alive through today until midnight: if yesterday was active
 * and today has no answers yet, the current streak is still yesterday's.
 */
export function computeStreak(activeDates: Iterable<string>, today: string): StreakInfo {
  const days = new Set(activeDates)
  const todayDone = days.has(today)

  let current = 0
  let cursor = todayDone ? today : addDays(today, -1)
  while (days.has(cursor)) {
    current++
    cursor = addDays(cursor, -1)
  }

  let best = 0
  for (const day of days) {
    // Only start counting at the first day of a run
    if (days.has(addDays(day, -1))) continue
    let len = 1
    let next = addDays(day, 1)
    while (days.has(next)) {
      len++
      next = addDays(next, 1)
    }
    best = Math.max(best, len)
  }

  return { current, best: Math.max(best, current), todayDone }
}
