import { describe, expect, it } from 'vitest'
import type { Level, Word } from '@/types'
import { isResumable, remainingCount, restoreRemaining, toSavedCards, type SavedSession } from './activeSession'

function word(id: string, level: Level = 'A1'): Word {
  return {
    id,
    word: id,
    forms: null,
    ipa: '/x/',
    pos: 'noun',
    level,
    category: 'home',
    translation: ['x'],
    synonyms: [],
    example: 'This is an example sentence.',
    exampleUk: 'Це приклад.',
  }
}

function saved(index: number, ids = ['a', 'b', 'c', 'd']): SavedSession {
  return {
    level: 'A1',
    category: 'mix',
    cards: ids.map((id, i) => ({ id, level: id.startsWith('b1-') ? 'B1' : 'A1', isReview: i === 1 })),
    index,
    known: index,
    unknown: 0,
    startedAt: 1,
    updatedAt: 2,
  }
}

describe('active session', () => {
  it('serializes cards as ids with level and review flag', () => {
    expect(toSavedCards([{ word: word('a'), isReview: false }, { word: word('x', 'B1'), isReview: true }])).toEqual([
      { id: 'a', level: 'A1', isReview: false },
      { id: 'x', level: 'B1', isReview: true },
    ])
  })

  it('counts the remaining cards', () => {
    expect(remainingCount(saved(0))).toBe(4)
    expect(remainingCount(saved(3))).toBe(1)
    expect(remainingCount(saved(4))).toBe(0)
  })

  it('offers to continue only after at least one answer and with cards left', () => {
    expect(isResumable(null)).toBe(false)
    expect(isResumable(saved(0))).toBe(false)
    expect(isResumable(saved(2))).toBe(true)
    expect(isResumable(saved(4))).toBe(false)
  })

  it('restores only the unanswered cards, across levels, skipping removed words', async () => {
    const s = saved(1, ['a', 'b', 'b1-x', 'gone', 'd'])
    const files: Partial<Record<Level, Word[]>> = { A1: [word('a'), word('b'), word('d')], B1: [word('b1-x', 'B1')] }
    const cards = await restoreRemaining(s, async (l) => files[l] ?? [])
    expect(cards.map((c) => c.word.id)).toEqual(['b', 'b1-x', 'd'])
    expect(cards[0].isReview).toBe(true)
  })
})
