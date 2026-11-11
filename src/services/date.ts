/** Local (phone) calendar date as YYYY-MM-DD. Never use UTC for streaks. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parse YYYY-MM-DD as a local date at midnight. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Whole calendar days between two date keys (b - a). DST-safe. */
export function daysBetween(a: string, b: string): number {
  const ua = Date.UTC(...ymd(a))
  const ub = Date.UTC(...ymd(b))
  return Math.round((ub - ua) / 86_400_000)
}

/** Date key shifted by n calendar days. */
export function addDays(key: string, n: number): string {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + n)
  return localDateKey(d)
}

function ymd(key: string): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number)
  return [y, m - 1, d]
}
