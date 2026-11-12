import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category, Level, Word } from '@/types'
import {
  clearWordCache,
  countAllWords,
  countNewByLevel,
  countNewWords,
  filterNewWords,
  levelUrl,
  loadLevel,
} from './wordSource'

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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Fake fetch serving a word list per level file. */
function fakeFetcher(files: Partial<Record<Level, Word[]>>) {
  return vi.fn(async (url: string) => {
    const level = url.match(/words\/(\w+)\.json$/)?.[1]?.toUpperCase() as Level | undefined
    const list = level ? files[level] : undefined
    return list ? jsonResponse(list) : jsonResponse({ error: 'not found' }, 404)
  })
}

beforeEach(() => clearWordCache())

describe('levelUrl', () => {
  it('builds a lowercase file name under the base path', () => {
    expect(levelUrl('B2', '/wordcards/')).toBe('/wordcards/words/b2.json')
  })
})

describe('loadLevel', () => {
  it('loads and parses the level file', async () => {
    const fetcher = fakeFetcher({ A1: [word('a'), word('b')] })
    const words = await loadLevel('A1', fetcher)
    expect(words.map((w) => w.id)).toEqual(['a', 'b'])
    expect(fetcher).toHaveBeenCalledWith(expect.stringMatching(/words\/a1\.json$/))
  })

  it('caches per level and fetches only once', async () => {
    const fetcher = fakeFetcher({ A1: [word('a')], A2: [word('c')] })
    await Promise.all([loadLevel('A1', fetcher), loadLevel('A1', fetcher)])
    await loadLevel('A1', fetcher)
    await loadLevel('A2', fetcher)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('does not cache failures, so the next call retries', async () => {
    const failing = vi.fn(async () => jsonResponse({}, 500))
    await expect(loadLevel('A1', failing)).rejects.toThrow(/HTTP 500/)

    const ok = fakeFetcher({ A1: [word('a')] })
    await expect(loadLevel('A1', ok)).resolves.toHaveLength(1)
  })

  it('rejects a file that is not an array', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ words: [] }))
    await expect(loadLevel('A1', fetcher)).rejects.toThrow(/expected an array/)
  })
})

describe('counting new words', () => {
  const words = [word('house', 'home'), word('door', 'home'), word('tree', 'nature'), word('sun', 'nature')]

  it('counts all words as new when nothing was answered', () => {
    expect(countNewWords(words, new Set())).toBe(4)
  })

  it('excludes words that are in progress (learned or review)', () => {
    expect(countNewWords(words, new Set(['house', 'sun']))).toBe(2)
  })

  it('filters by category; "mix" means all categories', () => {
    const seen = new Set(['house'])
    expect(countNewWords(words, seen, 'home')).toBe(1)
    expect(countNewWords(words, seen, 'nature')).toBe(2)
    expect(countNewWords(words, seen, 'mix')).toBe(3)
    expect(countNewWords(words, seen, 'sport')).toBe(0)
  })

  it('filterNewWords returns the same words that countNewWords counts', () => {
    const seen = new Set(['tree'])
    expect(filterNewWords(words, seen, 'nature').map((w) => w.id)).toEqual(['sun'])
    expect(filterNewWords(words, seen).length).toBe(countNewWords(words, seen))
  })

  it('countNewByLevel reports new and total per level; missing files count as empty', async () => {
    const fetcher = fakeFetcher({
      A1: words,
      A2: [word('travel', 'travel', 'A2'), word('river', 'nature', 'A2')],
    })
    const counts = await countNewByLevel(new Set(['house', 'river']), 'mix', fetcher)
    expect(counts.A1).toEqual({ total: 4, fresh: 3 })
    expect(counts.A2).toEqual({ total: 2, fresh: 1 })
    expect(counts.C2).toEqual({ total: 0, fresh: 0 })

    const nature = await countNewByLevel(new Set(['river']), 'nature', fetcher)
    expect(nature.A1).toEqual({ total: 2, fresh: 2 })
    expect(nature.A2).toEqual({ total: 1, fresh: 0 })
  })

  it('countAllWords sums every level', async () => {
    const fetcher = fakeFetcher({ A1: words, B1: [word('x', 'work', 'B1')] })
    expect(await countAllWords(fetcher)).toBe(5)
  })
})
