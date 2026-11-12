import { describe, expect, it } from 'vitest'
import type { ProgressRecord, Word } from '@/types'
import { addToActivity, applyAnswer } from './answers'

const go: Word = {
  id: 'go-verb',
  word: 'go',
  forms: ['go', 'went', 'gone'],
  ipa: '/ɡəʊ/',
  pos: 'verb',
  level: 'A1',
  category: 'travel',
  translation: ['йти', 'їхати'],
  synonyms: [],
  example: 'We go to the sea every summer.',
  exampleUk: 'Ми їздимо на море щоліта.',
}

describe('applyAnswer', () => {
  it('"know" on a new word → learned', () => {
    const { record, becameLearned } = applyAnswer(undefined, go, true, 1000)
    expect(record).toMatchObject({
      wordId: 'go-verb',
      status: 'learned',
      level: 'A1',
      category: 'travel',
      word: 'go',
      forms: ['go', 'went', 'gone'],
      translation: ['йти', 'їхати'],
      firstSeenAt: 1000,
      updatedAt: 1000,
      timesKnown: 1,
      timesUnknown: 0,
      lastCheckedAt: null,
    })
    expect(becameLearned).toBe(true)
  })

  it('"don\'t know" on a new word → review', () => {
    const { record, becameLearned } = applyAnswer(undefined, go, false, 1000)
    expect(record.status).toBe('review')
    expect(record.timesUnknown).toBe(1)
    expect(becameLearned).toBe(false)
  })

  it('review word + "know" → learned, keeps firstSeenAt and counters', () => {
    const existing = applyAnswer(undefined, go, false, 1000).record
    const { record, becameLearned } = applyAnswer(existing, go, true, 5000)
    expect(record.status).toBe('learned')
    expect(record.firstSeenAt).toBe(1000)
    expect(record.updatedAt).toBe(5000)
    expect(record.timesKnown).toBe(1)
    expect(record.timesUnknown).toBe(1)
    expect(becameLearned).toBe(true)
  })

  it('stores plain copies of arrays (IndexedDB cannot clone reactive proxies)', () => {
    const { record } = applyAnswer(undefined, go, true, 1000)
    expect(record.translation).not.toBe(go.translation)
    expect(record.forms).not.toBe(go.forms)
    expect(structuredClone(record)).toEqual(record)
  })

  it('a learned word known again does not count as newly learned', () => {
    const existing: ProgressRecord = { ...applyAnswer(undefined, go, true, 1000).record, lastCheckedAt: 2000 }
    const { record, becameLearned } = applyAnswer(existing, go, true, 3000)
    expect(becameLearned).toBe(false)
    expect(record.timesKnown).toBe(2)
    expect(record.lastCheckedAt).toBe(2000)
  })
})

describe('addToActivity', () => {
  it('starts a new day', () => {
    expect(addToActivity(undefined, '2026-11-12', true, true)).toEqual({
      date: '2026-11-12',
      answered: 1,
      known: 1,
      unknown: 0,
      newLearned: 1,
    })
  })

  it('adds to the existing day', () => {
    const day = { date: '2026-11-12', answered: 5, known: 3, unknown: 2, newLearned: 3 }
    expect(addToActivity(day, '2026-11-12', false, false)).toEqual({ ...day, answered: 6, unknown: 3 })
  })
})
