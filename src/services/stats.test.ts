import { describe, expect, it } from 'vitest'
import type { ActivityRecord, Category, Level, ProgressRecord, Word } from '@/types'
import {
  breakdownByCategory,
  breakdownByLevel,
  dailySeries,
  heatLevel,
  heatmapWeeks,
  monthStarts,
  weekdayIndex,
} from './stats'

const act = (date: string, answered: number): ActivityRecord => ({ date, answered, known: answered, unknown: 0, newLearned: 0 })

function word(id: string, level: Level, category: Category): Word {
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

function rec(id: string, level: Level, category: Category, status: 'learned' | 'review'): ProgressRecord {
  return {
    wordId: id,
    status,
    level,
    category,
    word: id,
    forms: null,
    translation: ['x'],
    firstSeenAt: 0,
    updatedAt: 0,
    timesKnown: 0,
    timesUnknown: 0,
    lastCheckedAt: null,
  }
}

describe('dailySeries', () => {
  it('returns the last 7 days ending today, filling gaps with 0', () => {
    const s = dailySeries([act('2026-11-12', 5), act('2026-11-09', 3), act('2026-10-01', 99)], '2026-11-12', 7)
    expect(s.map((d) => d.date)).toEqual(['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'])
    expect(s.map((d) => d.answered)).toEqual([0, 0, 0, 3, 0, 0, 5])
  })

  it('month view crosses the month boundary', () => {
    const s = dailySeries([], '2026-03-05', 30)
    expect(s).toHaveLength(30)
    expect(s[0].date).toBe('2026-02-04')
    expect(s.at(-1)!.date).toBe('2026-03-05')
  })
})

describe('heatLevel', () => {
  it.each([
    [0, 0],
    [1, 1],
    [9, 1],
    [10, 2],
    [19, 2],
    [20, 3],
    [39, 3],
    [40, 4],
    [100, 4],
  ])('%i answers with goal 20 → level %i', (n, level) => {
    expect(heatLevel(n, 20)).toBe(level)
  })
})

describe('heatmapWeeks', () => {
  it('builds Monday-first weeks ending with the current week; future days are empty', () => {
    // 2026-11-12 is a Thursday
    expect(weekdayIndex('2026-11-12')).toBe(3)
    const weeks = heatmapWeeks([act('2026-11-12', 25), act('2026-11-09', 5)], '2026-11-12', 20, 20)
    expect(weeks).toHaveLength(20)
    expect(weeks.every((w) => w.length === 7)).toBe(true)

    const last = weeks.at(-1)!
    expect(last[0]?.date).toBe('2026-11-09') // Monday
    expect(last[0]?.level).toBe(1)
    expect(last[3]).toMatchObject({ date: '2026-11-12', answered: 25, level: 3 })
    expect(last.slice(4)).toEqual([null, null, null])

    expect(weeks[0][0]?.date).toBe('2026-06-29') // 19 weeks earlier, a Monday
  })

  it('labels the first column of each month', () => {
    const weeks = heatmapWeeks([], '2026-11-12', 20, 20)
    const starts = monthStarts(weeks)
    expect(starts.map((s) => s.month)).toEqual([6, 7, 8, 9, 10]) // Jul…Nov (June label dropped: too close)
    expect(starts.every((s, i) => i === 0 || s.col > starts[i - 1].col)).toBe(true)
  })
})

describe('breakdowns', () => {
  const words = [
    word('a', 'A1', 'home'),
    word('b', 'A1', 'home'),
    word('c', 'A1', 'food'),
    word('d', 'A2', 'food'),
  ]
  const progress = [rec('a', 'A1', 'home', 'learned'), rec('c', 'A1', 'food', 'learned'), rec('d', 'A2', 'food', 'learned'), rec('b', 'A1', 'home', 'review')]

  it('counts learned, review and total per level', () => {
    const rows = breakdownByLevel(progress, words)
    expect(rows.map((r) => r.key)).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
    expect(rows[0]).toEqual({ key: 'A1', learned: 2, review: 1, total: 3 })
    expect(rows[1]).toEqual({ key: 'A2', learned: 1, review: 0, total: 1 })
    expect(rows[2]).toEqual({ key: 'B1', learned: 0, review: 0, total: 0 })
  })

  it('sorts categories by learned words, keeping base order for ties', () => {
    const rows = breakdownByCategory(progress, words)
    expect(rows).toHaveLength(14)
    expect(rows[0]).toEqual({ key: 'food', learned: 2, review: 0, total: 2 })
    expect(rows[1]).toEqual({ key: 'home', learned: 1, review: 1, total: 2 })
    expect(rows[2].key).toBe('nature') // first of the zero rows, in base order
  })
})
