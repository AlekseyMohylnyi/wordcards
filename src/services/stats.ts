// Data shaping for the Stats screen (pure functions + one loader).
import { CATEGORIES, LEVELS, type ActivityRecord, type Category, type Level, type ProgressRecord, type Word } from '@/types'
import { addDays, parseDateKey } from './date'

export interface DayPoint {
  date: string
  answered: number
}

/** Answers per day for the last `days` days, oldest first, ending today. Missing days are 0. */
export function dailySeries(activity: readonly ActivityRecord[], today: string, days: number): DayPoint[] {
  const byDate = new Map(activity.map((a) => [a.date, a.answered]))
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - (days - 1))
    return { date, answered: byDate.get(date) ?? 0 }
  })
}

export type HeatLevel = 0 | 1 | 2 | 3 | 4

/** Heatmap shade relative to the daily goal: 0 none, 1 < ½ goal, 2 < goal, 3 < 2× goal, 4 ≥ 2× goal. */
export function heatLevel(answered: number, goal: number): HeatLevel {
  if (answered <= 0) return 0
  const g = Math.max(1, goal)
  if (answered < g / 2) return 1
  if (answered < g) return 2
  if (answered < g * 2) return 3
  return 4
}

export interface HeatCell {
  date: string
  answered: number
  level: HeatLevel
}

/** Monday = 0 … Sunday = 6 */
export function weekdayIndex(date: string): number {
  return (parseDateKey(date).getDay() + 6) % 7
}

/**
 * Calendar for the last `weeks` weeks: columns are weeks (Monday first), rows are weekdays.
 * Days after today are null.
 */
export function heatmapWeeks(activity: readonly ActivityRecord[], today: string, goal: number, weeks = 20): (HeatCell | null)[][] {
  const byDate = new Map(activity.map((a) => [a.date, a.answered]))
  const thisMonday = addDays(today, -weekdayIndex(today))
  const firstMonday = addDays(thisMonday, -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(firstMonday, w * 7 + d)
      if (date > today) return null
      const answered = byDate.get(date) ?? 0
      return { date, answered, level: heatLevel(answered, goal) }
    }),
  )
}

/** Column indexes where a new month starts (first column always labelled). */
export function monthStarts(columns: (HeatCell | null)[][]): { col: number; month: number }[] {
  const out: { col: number; month: number }[] = []
  let prev = -1
  columns.forEach((week, col) => {
    const first = week.find((c) => c)?.date
    if (!first) return
    const month = parseDateKey(first).getMonth()
    if (month !== prev) out.push({ col, month })
    prev = month
  })
  // drop a first label that would collide with the next one
  if (out.length > 1 && out[1].col - out[0].col < 3) out.shift()
  return out
}

export interface Breakdown<K extends string> {
  key: K
  learned: number
  review: number
  /** Words in the base for this key */
  total: number
}

function breakdown<K extends string>(
  keys: readonly K[],
  progress: readonly ProgressRecord[],
  words: readonly Word[],
  keyOf: (x: { level: Level; category: Category }) => K,
): Breakdown<K>[] {
  const rows = new Map(keys.map((k) => [k, { key: k, learned: 0, review: 0, total: 0 }]))
  for (const w of words) {
    const row = rows.get(keyOf(w))
    if (row) row.total++
  }
  for (const p of progress) {
    const row = rows.get(keyOf(p))
    if (!row) continue
    if (p.status === 'learned') row.learned++
    else row.review++
  }
  return keys.map((k) => rows.get(k)!)
}

export function breakdownByLevel(progress: readonly ProgressRecord[], words: readonly Word[]): Breakdown<Level>[] {
  return breakdown(LEVELS, progress, words, (x) => x.level)
}

/** Categories, most learned first (ties keep the base order). */
export function breakdownByCategory(progress: readonly ProgressRecord[], words: readonly Word[]): Breakdown<Category>[] {
  return breakdown(CATEGORIES, progress, words, (x) => x.category)
    .map((row, i) => ({ row, i }))
    .sort((a, b) => b.row.learned - a.row.learned || a.i - b.i)
    .map(({ row }) => row)
}

// --- loader ---

export interface StatsData {
  activity: ActivityRecord[]
  progress: ProgressRecord[]
  words: Word[]
  earned: Map<string, number>
}

export async function loadStatsData(): Promise<StatsData> {
  const { db } = await import('@/db')
  const { loadLevel } = await import('./wordSource')
  const [activity, progress, lists, badges] = await Promise.all([
    db.activity.toArray(),
    db.progress.toArray(),
    Promise.all(LEVELS.map((l) => loadLevel(l).catch(() => [] as Word[]))),
    db.badges.toArray(),
  ])
  return { activity, progress, words: lists.flat(), earned: new Map(badges.map((b) => [b.id, b.earnedAt])) }
}
