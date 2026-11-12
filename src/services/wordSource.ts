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

// ---------------------------------------------------------------------------
// Session building (rules 3–5, 11)

/** Share of a session taken by "review" words, rounded down (20 → 5). */
export const REVIEW_SHARE = 0.25

export interface SessionCard {
  word: Word
  isReview: boolean
}

export interface SessionPlan {
  cards: SessionCard[]
  /** New words the session wanted (size minus review words) */
  newWanted: number
  /** New words that were actually available */
  newAvailable: number
  reviewCount: number
  /** Not enough new words in this level/category (rule 11) */
  exhausted: boolean
}

export type Rng = () => number

/** Fisher–Yates shuffle into a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface PlanInput {
  level: Level
  category: CategoryFilter
  size: number
  /** All words of the chosen level */
  levelWords: readonly Word[]
  /** Full word entries for every progress record with status "review" (any level) */
  reviewWords: readonly Word[]
  /** IDs of every word in progress (learned or review) */
  seenIds: ReadonlySet<string>
  rng?: Rng
}

/**
 * Pick the cards for a session:
 * - floor(size × 25%) review words, preferring same level+category, then same level, then any;
 * - the rest are new words (never answered) of the level/category;
 * - if review words are scarce, more new words fill the gap;
 * - every word appears at most once; the order is shuffled.
 */
export function planSession(input: PlanInput): SessionPlan {
  const { level, category, size, levelWords, reviewWords, seenIds, rng = Math.random } = input

  // Review candidates by priority tier, shuffled inside each tier
  const uniqueReview = [...new Map(reviewWords.map((w) => [w.id, w])).values()]
  const tier = (w: Word) => (w.level === level && matchesCategory(w, category) ? 0 : w.level === level ? 1 : 2)
  const tiers: Word[][] = [[], [], []]
  for (const w of uniqueReview) tiers[tier(w)].push(w)
  const reviewOrdered = tiers.flatMap((t) => shuffle(t, rng))

  const reviewTarget = Math.floor(size * REVIEW_SHARE)
  const review = reviewOrdered.slice(0, reviewTarget)

  const newWanted = size - review.length
  const newPool = shuffle(filterNewWords(levelWords, seenIds, category), rng)
  const fresh = newPool.slice(0, newWanted)

  const cards = shuffle(
    [...review.map((word) => ({ word, isReview: true })), ...fresh.map((word) => ({ word, isReview: false }))],
    rng,
  )

  return {
    cards,
    newWanted,
    newAvailable: newPool.length,
    reviewCount: review.length,
    exhausted: newPool.length < newWanted,
  }
}

export interface ReviewRecordRef {
  wordId: string
  level: Level
}

export interface SessionDeps {
  loadLevel: (level: Level) => Promise<Word[]>
  getSeenIds: () => Promise<Set<string>>
  getReviewRecords: () => Promise<ReviewRecordRef[]>
}

const defaultDeps: SessionDeps = {
  loadLevel: (level) => loadLevel(level),
  getSeenIds: async () => (await import('@/db')).getSeenIds(),
  getReviewRecords: async () => {
    const { db } = await import('@/db')
    return db.progress.where('status').equals('review').toArray()
  },
}

/** Load everything a session needs and plan it. */
export async function buildSession(
  level: Level,
  category: CategoryFilter,
  size: number,
  deps: SessionDeps = defaultDeps,
  rng: Rng = Math.random,
): Promise<SessionPlan> {
  const [levelWords, seenIds, reviewRecords] = await Promise.all([
    deps.loadLevel(level),
    deps.getSeenIds(),
    deps.getReviewRecords(),
  ])

  // Resolve review records to full word entries (they may come from other levels)
  const levelsNeeded = [...new Set(reviewRecords.map((r) => r.level))]
  const lists = await Promise.all(levelsNeeded.map((l) => deps.loadLevel(l).catch(() => [] as Word[])))
  const byId = new Map(lists.flat().map((w) => [w.id, w]))
  const reviewWords = reviewRecords.map((r) => byId.get(r.wordId)).filter((w): w is Word => !!w)

  return planSession({ level, category, size, levelWords, reviewWords, seenIds, rng })
}

/** Total number of words across all levels. */
export async function countAllWords(fetcher?: Fetcher): Promise<number> {
  const lists = await Promise.all(LEVELS.map((l) => loadLevel(l, fetcher).catch(() => [] as Word[])))
  return lists.reduce((sum, list) => sum + list.length, 0)
}
