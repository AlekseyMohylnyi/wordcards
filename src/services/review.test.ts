import { describe, expect, it } from 'vitest'
import type { Level, ProgressRecord, Word } from '@/types'
import {
  CHECK_MIN_LEARNED,
  applyCheckAnswer,
  buildCheckSession,
  pickCheckRecords,
  shouldShowCheckBanner,
  snoozeUntil,
} from './review'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 10, 12, 12)

function rec(id: string, extra: Partial<ProgressRecord> = {}): ProgressRecord {
  return {
    wordId: id,
    status: 'learned',
    level: 'A1',
    category: 'home',
    word: id,
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

describe('shouldShowCheckBanner', () => {
  const base = { learnedCount: CHECK_MIN_LEARNED, lastCheckAt: null, snoozedUntil: null, now: NOW }

  it('needs at least 20 learned words', () => {
    expect(shouldShowCheckBanner({ ...base, learnedCount: 19 })).toBe(false)
    expect(shouldShowCheckBanner({ ...base, learnedCount: 20 })).toBe(true)
  })

  it('shows when there was no check yet', () => {
    expect(shouldShowCheckBanner(base)).toBe(true)
  })

  it('waits 7 days after the last check', () => {
    expect(shouldShowCheckBanner({ ...base, lastCheckAt: NOW - 6 * DAY })).toBe(false)
    expect(shouldShowCheckBanner({ ...base, lastCheckAt: NOW - 7 * DAY + 1 })).toBe(false)
    expect(shouldShowCheckBanner({ ...base, lastCheckAt: NOW - 7 * DAY })).toBe(true)
    expect(shouldShowCheckBanner({ ...base, lastCheckAt: NOW - 30 * DAY })).toBe(true)
  })

  it('"Later" hides it for 2 days', () => {
    const until = snoozeUntil(NOW)
    expect(until).toBe(NOW + 2 * DAY)
    expect(shouldShowCheckBanner({ ...base, snoozedUntil: until, now: NOW + DAY })).toBe(false)
    expect(shouldShowCheckBanner({ ...base, snoozedUntil: until, now: NOW + 2 * DAY })).toBe(true)
  })

  it('a snooze does not override the 7-day wait', () => {
    expect(shouldShowCheckBanner({ ...base, lastCheckAt: NOW - DAY, snoozedUntil: NOW - DAY })).toBe(false)
  })

  it('the dev switch forces it', () => {
    expect(shouldShowCheckBanner({ ...base, learnedCount: 0, lastCheckAt: NOW, snoozedUntil: NOW + DAY, force: true })).toBe(true)
  })
})

describe('pickCheckRecords', () => {
  it('takes only learned words', () => {
    const picked = pickCheckRecords([rec('a'), rec('b', { status: 'review' }), rec('c')], 10)
    expect(picked.map((r) => r.wordId)).toEqual(['a', 'c'])
  })

  it('puts never-checked first, then the oldest checked; ties by learn time', () => {
    const records = [
      rec('checked-recently', { lastCheckedAt: NOW - DAY }),
      rec('never-late', { updatedAt: 50 }),
      rec('checked-long-ago', { lastCheckedAt: NOW - 30 * DAY }),
      rec('never-early', { updatedAt: 10 }),
      rec('checked-mid', { lastCheckedAt: NOW - 10 * DAY }),
    ]
    expect(pickCheckRecords(records, 10).map((r) => r.wordId)).toEqual([
      'never-early',
      'never-late',
      'checked-long-ago',
      'checked-mid',
      'checked-recently',
    ])
  })

  it('limits to the session size and does not mutate the input', () => {
    const records = [rec('a', { lastCheckedAt: 3 }), rec('b', { lastCheckedAt: 1 }), rec('c', { lastCheckedAt: 2 })]
    expect(pickCheckRecords(records, 2).map((r) => r.wordId)).toEqual(['b', 'c'])
    expect(records.map((r) => r.wordId)).toEqual(['a', 'b', 'c'])
  })
})

describe('applyCheckAnswer', () => {
  it('"know" keeps the word learned and stamps lastCheckedAt', () => {
    const r = applyCheckAnswer(rec('a', { timesKnown: 2 }), true, NOW)
    expect(r).toMatchObject({ status: 'learned', lastCheckedAt: NOW, updatedAt: NOW, timesKnown: 3, timesUnknown: 0 })
  })

  it('"don\'t know" moves the word to review', () => {
    const r = applyCheckAnswer(rec('a'), false, NOW)
    expect(r).toMatchObject({ status: 'review', lastCheckedAt: NOW, timesKnown: 1, timesUnknown: 1 })
  })

  it('returns a cloneable plain object', () => {
    const r = applyCheckAnswer(rec('a', { forms: ['go', 'went', 'gone'] }), true, NOW)
    expect(structuredClone(r)).toEqual(r)
  })
})

describe('buildCheckSession', () => {
  it('builds cards from learned records across levels, oldest checked first', async () => {
    const records = [
      rec('a1-word', { lastCheckedAt: NOW - DAY }),
      rec('b1-word', { level: 'B1', lastCheckedAt: null }),
      rec('removed', { lastCheckedAt: null }),
      rec('review-word', { status: 'review' }),
    ]
    const files: Partial<Record<Level, Word[]>> = { A1: [word('a1-word'), word('review-word')], B1: [word('b1-word', 'B1')] }
    const plan = await buildCheckSession(20, { getLearned: async () => records, loadLevel: async (l) => files[l] ?? [] })
    expect(plan.cards.map((c) => c.word.id)).toEqual(['b1-word', 'a1-word'])
    expect(plan.cards.every((c) => !c.isReview)).toBe(true)
  })
})
