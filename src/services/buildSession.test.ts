import { describe, expect, it } from 'vitest'
import { CATEGORIES, type Category, type Level, type Word } from '@/types'
import { buildSession, planSession, shuffle, type ReviewRecordRef, type SessionDeps } from './wordSource'

function word(id: string, category: Category = 'home', level: Level = 'A1'): Word {
  return {
    id,
    word: id,
    forms: null,
    ipa: '/x/',
    pos: 'noun',
    level,
    category,
    translation: ['x'],
    synonyms: [],
    example: 'This is an example sentence.',
    exampleUk: 'Це приклад.',
  }
}

/** Deterministic PRNG for repeatable tests */
function seeded(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** n words per category for a level, ids like "a1-home-3" */
function bank(level: Level, perCategory: number): Word[] {
  return CATEGORIES.flatMap((c) =>
    Array.from({ length: perCategory }, (_, i) => word(`${level.toLowerCase()}-${c}-${i}`, c, level)),
  )
}

const ids = (cards: { word: Word }[]) => cards.map((c) => c.word.id)

describe('shuffle', () => {
  it('keeps all items and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const out = shuffle(input, seeded(1))
    expect(out.slice().sort()).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('planSession', () => {
  const a1 = bank('A1', 10)

  it('gives only new words when nothing is on review', () => {
    const plan = planSession({ level: 'A1', category: 'mix', size: 20, levelWords: a1, reviewWords: [], seenIds: new Set(), rng: seeded(2) })
    expect(plan.cards).toHaveLength(20)
    expect(plan.reviewCount).toBe(0)
    expect(plan.cards.every((c) => !c.isReview)).toBe(true)
    expect(plan.exhausted).toBe(false)
  })

  it('never includes words that are already in progress as new', () => {
    const seen = new Set(a1.slice(0, 100).map((w) => w.id))
    for (let s = 0; s < 20; s++) {
      const plan = planSession({ level: 'A1', category: 'mix', size: 30, levelWords: a1, reviewWords: [], seenIds: seen, rng: seeded(s) })
      expect(plan.cards.some((c) => seen.has(c.word.id))).toBe(false)
    }
  })

  it('has no duplicate cards', () => {
    const review = a1.slice(0, 8)
    const seen = new Set(review.map((w) => w.id))
    const plan = planSession({
      level: 'A1',
      category: 'mix',
      size: 30,
      levelWords: a1,
      reviewWords: [...review, ...review], // duplicates in input must collapse
      seenIds: seen,
      rng: seeded(3),
    })
    expect(new Set(ids(plan.cards)).size).toBe(plan.cards.length)
  })

  it.each([
    [10, 2],
    [20, 5],
    [30, 7],
  ])('mixes floor(25%%) review words: size %i → %i', (size, expected) => {
    const review = a1.slice(0, 20)
    const plan = planSession({
      level: 'A1',
      category: 'mix',
      size,
      levelWords: a1,
      reviewWords: review,
      seenIds: new Set(review.map((w) => w.id)),
      rng: seeded(size),
    })
    expect(plan.cards).toHaveLength(size)
    expect(plan.reviewCount).toBe(expected)
    expect(plan.cards.filter((c) => c.isReview)).toHaveLength(expected)
  })

  it('fills with new words when there are few review words', () => {
    const review = [a1[0], a1[1]]
    const plan = planSession({
      level: 'A1',
      category: 'mix',
      size: 20,
      levelWords: a1,
      reviewWords: review,
      seenIds: new Set(review.map((w) => w.id)),
      rng: seeded(4),
    })
    expect(plan.cards).toHaveLength(20)
    expect(plan.reviewCount).toBe(2)
    expect(plan.newWanted).toBe(18)
  })

  it('prefers review words of the same category and level, then same level, then any', () => {
    const sameCat = [word('r-food-1', 'food'), word('r-food-2', 'food')]
    const sameLevel = [word('r-home-1', 'home'), word('r-home-2', 'home'), word('r-city-1', 'city')]
    const otherLevel = [word('r-b1-1', 'food', 'B1'), word('r-b1-2', 'food', 'B1')]
    const all = [...otherLevel, ...sameLevel, ...sameCat]
    const seen = new Set(all.map((w) => w.id))
    const food = a1.filter((w) => w.category === 'food')

    // size 20 → 5 review: 2 same-category + 3 same-level, none from B1
    const plan = planSession({ level: 'A1', category: 'food', size: 20, levelWords: a1, reviewWords: all, seenIds: seen, rng: seeded(5) })
    const reviewIds = plan.cards.filter((c) => c.isReview).map((c) => c.word.id).sort()
    expect(reviewIds).toEqual(['r-city-1', 'r-food-1', 'r-food-2', 'r-home-1', 'r-home-2'])
    // new words come only from the chosen category
    expect(plan.cards.filter((c) => !c.isReview).every((c) => c.word.category === 'food')).toBe(true)
    expect(plan.newAvailable).toBe(food.length)
  })

  it('uses other levels when the level has no review words', () => {
    const otherLevel = [word('r-b1-1', 'food', 'B1'), word('r-b1-2', 'work', 'B1')]
    const plan = planSession({
      level: 'A1',
      category: 'mix',
      size: 10,
      levelWords: a1,
      reviewWords: otherLevel,
      seenIds: new Set(otherLevel.map((w) => w.id)),
      rng: seeded(6),
    })
    expect(plan.reviewCount).toBe(2)
  })

  it('marks the plan exhausted when not enough new words are left (rule 11)', () => {
    const home = a1.filter((w) => w.category === 'home') // 10 words
    const seen = new Set(home.slice(0, 7).map((w) => w.id)) // 3 new left
    const plan = planSession({ level: 'A1', category: 'home', size: 20, levelWords: a1, reviewWords: [], seenIds: seen, rng: seeded(7) })
    expect(plan.exhausted).toBe(true)
    expect(plan.newAvailable).toBe(3)
    expect(plan.cards).toHaveLength(3)
  })

  it('shuffles the order (review words are not all at the start)', () => {
    const review = a1.slice(0, 20)
    const seen = new Set(review.map((w) => w.id))
    const orders = new Set<string>()
    for (let s = 0; s < 5; s++) {
      const plan = planSession({ level: 'A1', category: 'mix', size: 20, levelWords: a1, reviewWords: review, seenIds: seen, rng: seeded(100 + s) })
      orders.add(plan.cards.map((c) => (c.isReview ? 'R' : 'n')).join(''))
    }
    expect(orders.size).toBeGreaterThan(1)
  })
})

describe('buildSession', () => {
  it('loads the level, resolves review records from other levels and plans the session', async () => {
    const a1 = bank('A1', 3)
    const b1 = bank('B1', 1)
    const records: ReviewRecordRef[] = [
      { wordId: 'a1-home-0', level: 'A1' },
      { wordId: 'b1-food-0', level: 'B1' },
      { wordId: 'deleted-word', level: 'B1' }, // removed from the base: skipped
    ]
    const loaded: Level[] = []
    const deps: SessionDeps = {
      loadLevel: async (l) => {
        loaded.push(l)
        return l === 'A1' ? a1 : l === 'B1' ? b1 : []
      },
      getSeenIds: async () => new Set(records.map((r) => r.wordId)),
      getReviewRecords: async () => records,
    }

    const plan = await buildSession('A1', 'mix', 10, deps, seeded(9))
    expect(plan.cards).toHaveLength(10)
    expect(plan.reviewCount).toBe(2)
    expect(plan.cards.filter((c) => c.isReview).map((c) => c.word.id).sort()).toEqual(['a1-home-0', 'b1-food-0'])
    expect(loaded).toContain('B1')
  })
})
