import { describe, expect, it } from 'vitest'
import type { ProgressRecord } from '@/types'
import { countByStatus, filterWords, matchesQuery, moveRecord, normalizeQuery, otherStatus } from './wordsList'

function rec(word: string, extra: Partial<ProgressRecord> = {}): ProgressRecord {
  return {
    wordId: `${word}-x`,
    status: 'learned',
    level: 'A1',
    category: 'home',
    word,
    forms: null,
    translation: ['x'],
    firstSeenAt: 0,
    updatedAt: 0,
    timesKnown: 1,
    timesUnknown: 0,
    lastCheckedAt: null,
    ...extra,
  }
}

const go = rec('go', { forms: ['go', 'went', 'gone'], translation: ['йти', 'їхати'], updatedAt: 30 })
const family = rec('family', { translation: ["сім'я", 'родина'], updatedAt: 20 })
const house = rec('house', { translation: ['будинок', 'дім'], status: 'review', updatedAt: 10 })
const all = [house, family, go]

describe('normalizeQuery', () => {
  it('lowercases, trims and unifies apostrophes', () => {
    expect(normalizeQuery('  Сім’Я  ')).toBe("сім'я")
    expect(normalizeQuery('сімʼя')).toBe("сім'я")
  })
})

describe('matchesQuery', () => {
  it('matches the English word', () => {
    expect(matchesQuery(family, 'FAM')).toBe(true)
  })

  it('matches irregular verb forms', () => {
    expect(matchesQuery(go, 'went')).toBe(true)
    expect(matchesQuery(go, 'gone')).toBe(true)
  })

  it('matches any Ukrainian translation, with any apostrophe', () => {
    expect(matchesQuery(go, 'їха')).toBe(true)
    expect(matchesQuery(family, 'сім’я')).toBe(true)
    expect(matchesQuery(family, 'родин')).toBe(true)
  })

  it('an empty query matches everything; a wrong one nothing', () => {
    expect(matchesQuery(house, '   ')).toBe(true)
    expect(matchesQuery(house, 'tree')).toBe(false)
  })
})

describe('filterWords', () => {
  it('keeps one list, most recently changed first', () => {
    expect(filterWords(all, 'learned').map((r) => r.word)).toEqual(['go', 'family'])
    expect(filterWords(all, 'review').map((r) => r.word)).toEqual(['house'])
  })

  it('combines the list and the query', () => {
    expect(filterWords(all, 'learned', 'дім')).toEqual([])
    expect(filterWords(all, 'review', 'дім').map((r) => r.word)).toEqual(['house'])
  })

  it('does not mutate the input', () => {
    const copy = all.slice()
    filterWords(all, 'learned')
    expect(all).toEqual(copy)
  })
})

describe('counts and moves', () => {
  it('counts both lists', () => {
    expect(countByStatus(all)).toEqual({ learned: 2, review: 1 })
  })

  it('moves to the other list, keeping counters', () => {
    expect(otherStatus('learned')).toBe('review')
    const moved = moveRecord(go, 99)
    expect(moved).toMatchObject({ status: 'review', updatedAt: 99, timesKnown: 1, timesUnknown: 0, firstSeenAt: 0 })
    expect(moveRecord(moved, 100).status).toBe('learned')
  })

  it('undo is restoring the previous record', () => {
    const moved = moveRecord(go, 99)
    const list = [house, family, moved]
    const undone = list.map((r) => (r.wordId === go.wordId ? go : r))
    expect(filterWords(undone, 'learned').map((r) => r.word)).toEqual(['go', 'family'])
  })

  it('a moved record is a plain cloneable object', () => {
    const moved = moveRecord(go, 1)
    expect(structuredClone(moved)).toEqual(moved)
    expect(moved.forms).not.toBe(go.forms)
  })
})
