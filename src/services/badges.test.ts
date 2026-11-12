import { describe, expect, it } from 'vitest'
import { BADGES, badgeProgress, isEarned, newlyEarned, type BadgeContext } from './badges'

const empty: BadgeContext = { sessionsCompleted: 0, learnedCount: 0, bestStreak: 0, checksCompleted: 0 }
const ids = (list: { id: string }[]) => list.map((b) => b.id)
const def = (id: string) => BADGES.find((b) => b.id === id)!

describe('badge list', () => {
  it('has every badge from CLAUDE.md, with unique ids', () => {
    expect(ids([...BADGES])).toEqual([
      'first-session',
      'learned-10',
      'learned-50',
      'learned-100',
      'learned-250',
      'learned-500',
      'learned-1000',
      'streak-3',
      'streak-7',
      'streak-14',
      'streak-30',
      'streak-100',
      'first-check',
    ])
    expect(new Set(ids([...BADGES])).size).toBe(BADGES.length)
  })
})

describe('isEarned', () => {
  it('first session after one finished session', () => {
    expect(isEarned(def('first-session'), empty)).toBe(false)
    expect(isEarned(def('first-session'), { ...empty, sessionsCompleted: 1 })).toBe(true)
  })

  it('learned thresholds are inclusive', () => {
    expect(isEarned(def('learned-10'), { ...empty, learnedCount: 9 })).toBe(false)
    expect(isEarned(def('learned-10'), { ...empty, learnedCount: 10 })).toBe(true)
  })

  it('streak badges use the best streak, so a broken streak keeps them', () => {
    expect(isEarned(def('streak-7'), { ...empty, bestStreak: 7 })).toBe(true)
    expect(isEarned(def('streak-14'), { ...empty, bestStreak: 13 })).toBe(false)
  })

  it('first check after one finished check session', () => {
    expect(isEarned(def('first-check'), { ...empty, checksCompleted: 1 })).toBe(true)
  })
})

describe('newlyEarned', () => {
  it('returns nothing for a new user', () => {
    expect(newlyEarned(empty, new Set())).toEqual([])
  })

  it('returns all reached badges that were not earned before', () => {
    const ctx = { sessionsCompleted: 1, learnedCount: 55, bestStreak: 3, checksCompleted: 0 }
    expect(ids(newlyEarned(ctx, new Set()))).toEqual(['first-session', 'learned-10', 'learned-50', 'streak-3'])
    expect(ids(newlyEarned(ctx, new Set(['first-session', 'learned-10'])))).toEqual(['learned-50', 'streak-3'])
  })

  it('does not award a badge twice', () => {
    const ctx = { ...empty, learnedCount: 10 }
    const first = newlyEarned(ctx, new Set())
    expect(newlyEarned(ctx, new Set(ids(first)))).toEqual([])
  })
})

describe('badgeProgress', () => {
  it('is a fraction capped at 1', () => {
    expect(badgeProgress(def('learned-100'), { ...empty, learnedCount: 25 })).toBe(0.25)
    expect(badgeProgress(def('learned-100'), { ...empty, learnedCount: 300 })).toBe(1)
  })
})
