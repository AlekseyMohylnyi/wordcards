import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, localDateKey, parseDateKey } from './date'

describe('date helpers', () => {
  it('formats local date with zero padding', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('round-trips parse and format', () => {
    expect(localDateKey(parseDateKey('2026-11-11'))).toBe('2026-11-11')
  })

  it('counts days across month and year boundaries', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
    expect(daysBetween('2026-03-01', '2026-02-28')).toBe(-1)
    expect(daysBetween('2026-11-11', '2026-11-11')).toBe(0)
  })

  it('counts days across DST changes', () => {
    // Europe/Kyiv switches clocks on the last Sunday of March / October
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
  })

  it('adds days', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })
})
