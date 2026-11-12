import { describe, expect, it } from 'vitest'
import { computeStreak } from './streak'

const TODAY = '2026-11-12'

describe('computeStreak', () => {
  it('is zero with no activity', () => {
    expect(computeStreak([], TODAY)).toEqual({ current: 0, best: 0, todayDone: false })
  })

  it('counts today as a one-day streak', () => {
    expect(computeStreak([TODAY], TODAY)).toEqual({ current: 1, best: 1, todayDone: true })
  })

  it('counts consecutive days ending today', () => {
    expect(computeStreak(['2026-11-10', '2026-11-11', TODAY], TODAY).current).toBe(3)
  })

  it('keeps yesterday’s streak alive while today has no answers yet', () => {
    const s = computeStreak(['2026-11-10', '2026-11-11'], TODAY)
    expect(s.current).toBe(2)
    expect(s.todayDone).toBe(false)
  })

  it('resets when a whole day was missed', () => {
    expect(computeStreak(['2026-11-09', '2026-11-10'], TODAY).current).toBe(0)
  })

  it('finds the best streak in the past', () => {
    const dates = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-11-11', TODAY]
    expect(computeStreak(dates, TODAY)).toEqual({ current: 2, best: 4, todayDone: true })
  })

  it('handles month and year boundaries and ignores order and duplicates', () => {
    const dates = ['2027-01-01', '2026-12-31', '2026-12-30', '2026-12-31']
    expect(computeStreak(dates, '2027-01-01')).toEqual({ current: 3, best: 3, todayDone: true })
  })
})
