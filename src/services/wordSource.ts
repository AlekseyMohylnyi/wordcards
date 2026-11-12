import { LEVELS, type Category, type Level, type Word } from '@/types'

export type CategoryFilter = Category | 'mix'
type Fetcher = (url: string) => Promise<Response>

const cache = new Map<Level, Promise<Word[]>>()

export function levelUrl(level: Level, base: string = import.meta.env.BASE_URL): string {
  return `${base}words/${level.toLowerCase()}.json`
}

/**
 * Load public/words/<level>.json. Results are cached in memory per level;
 * the service worker caches the file itself for offline use.
 * A failed request is not cached, so the next call retries.
 */
export function loadLevel(level: Level, fetcher: Fetcher = (url) => fetch(url)): Promise<Word[]> {
  const cached = cache.get(level)
  if (cached) return cached

  const url = levelUrl(level)
  const promise = fetcher(url).then(async (res) => {
    if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`)
    const data: unknown = await res.json()
    if (!Array.isArray(data)) throw new Error(`${url}: expected an array`)
    return data as Word[]
  })
  cache.set(level, promise)
  promise.catch(() => {
    if (cache.get(level) === promise) cache.delete(level)
  })
  return promise
}

/** Forget cached word lists (used by tests and after an app update). */
export function clearWordCache(): void {
  cache.clear()
}

export function matchesCategory(word: Word, category: CategoryFilter): boolean {
  return category === 'mix' || word.category === category
}

/** Words the user has never answered: not present in progress at all. */
export function filterNewWords(words: readonly Word[], seenIds: ReadonlySet<string>, category: CategoryFilter = 'mix'): Word[] {
  return words.filter((w) => matchesCategory(w, category) && !seenIds.has(w.id))
}

export function countNewWords(words: readonly Word[], seenIds: ReadonlySet<string>, category: CategoryFilter = 'mix'): number {
  let n = 0
  for (const w of words) if (matchesCategory(w, category) && !seenIds.has(w.id)) n++
  return n
}

export interface LevelCount {
  /** Words in the level (for the category) */
  total: number
  /** Words never answered */
  fresh: number
}

/** New/total word counts for every level. A level that fails to load counts as empty. */
export async function countNewByLevel(
  seenIds: ReadonlySet<string>,
  category: CategoryFilter = 'mix',
  fetcher?: Fetcher,
): Promise<Record<Level, LevelCount>> {
  const lists = await Promise.all(LEVELS.map((l) => loadLevel(l, fetcher).catch(() => [] as Word[])))
  const result = {} as Record<Level, LevelCount>
  LEVELS.forEach((level, i) => {
    const words = lists[i]
    result[level] = {
      total: words.filter((w) => matchesCategory(w, category)).length,
      fresh: countNewWords(words, seenIds, category),
    }
  })
  return result
}

/** Total number of words across all levels. */
export async function countAllWords(fetcher?: Fetcher): Promise<number> {
  const lists = await Promise.all(LEVELS.map((l) => loadLevel(l, fetcher).catch(() => [] as Word[])))
  return lists.reduce((sum, list) => sum + list.length, 0)
}
