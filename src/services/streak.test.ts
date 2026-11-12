import { describe, expect, it } from 'vitest'
import { computeStreak } from './streak'
import { localDateKey } from './date'

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

  it('answers at 23:59 and 00:01 count as two consecutive days (local midnight)', () => {
    const lateNight = localDateKey(new Date(2026, 10, 11, 23, 59))
    const afterMidnight = localDateKey(new Date(2026, 10, 12, 0, 1))
    expect(lateNight).toBe('2026-11-11')
    expect(afterMidnight).toBe('2026-11-12')
    expect(computeStreak([lateNight, afterMidnight], afterMidnight)).toEqual({ current: 2, best: 2, todayDone: true })
  })

  it('just after midnight, yesterday’s streak is still shown until the first answer', () => {
    const today = localDateKey(new Date(2026, 10, 12, 0, 5))
    expect(computeStreak(['2026-11-10', '2026-11-11'], today)).toMatchObject({ current: 2, todayDone: false })
  })

  it('one missed day in the middle splits the streak', () => {
    const dates = ['2026-11-05', '2026-11-06', '2026-11-07', /* 08 missed */ '2026-11-09', '2026-11-10', '2026-11-11', TODAY]
    expect(computeStreak(dates, TODAY)).toEqual({ current: 4, best: 4, todayDone: true })
  })

  it('several missed days reset the current streak but keep the record', () => {
    const dates = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05']
    expect(computeStreak(dates, TODAY)).toEqual({ current: 0, best: 5, todayDone: false })
  })

  it('crosses DST changes without losing a day', () => {
    const dates = ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27']
    expect(computeStreak(dates, '2026-10-27').current).toBe(4)
  })

  it('handles month and year boundaries and ignores order and duplicates', () => {
    const dates = ['2027-01-01', '2026-12-31', '2026-12-30', '2026-12-31']
    expect(computeStreak(dates, '2027-01-01')).toEqual({ current: 3, best: 3, todayDone: true })
  })
})
