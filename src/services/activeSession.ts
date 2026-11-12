// An unfinished learning session, kept in the settings table so the user can
// continue it from the Home screen (even after the app was closed).
import type { Level, Word } from '@/types'
import type { CategoryFilter, SessionCard } from './wordSource'

export const ACTIVE_SESSION_KEY = 'activeSession'

export interface SavedCard {
  id: string
  level: Level
  isReview: boolean
}

export interface SavedSession {
  level: Level
  category: CategoryFilter
  /** The whole card list in session order */
  cards: SavedCard[]
  /** Number of cards already answered (cards[index] is the next one) */
  index: number
  known: number
  unknown: number
  startedAt: number
  updatedAt: number
}

export function toSavedCards(cards: readonly SessionCard[]): SavedCard[] {
  return cards.map((c) => ({ id: c.word.id, level: c.word.level, isReview: c.isReview }))
}

export function remainingCount(s: SavedSession): number {
  return Math.max(0, s.cards.length - s.index)
}

/** Worth offering "continue": at least one answer given and cards left. */
export function isResumable(s: SavedSession | null | undefined): s is SavedSession {
  return !!s && s.index > 0 && remainingCount(s) > 0
}

/**
 * Rebuild the remaining cards from their word IDs.
 * Words removed from the base since then are skipped.
 */
export async function restoreRemaining(s: SavedSession, loadLevel: (level: Level) => Promise<Word[]>): Promise<SessionCard[]> {
  const remaining = s.cards.slice(s.index)
  const levels = [...new Set(remaining.map((c) => c.level))]
  const lists = await Promise.all(levels.map((l) => loadLevel(l).catch(() => [] as Word[])))
  const byId = new Map(lists.flat().map((w) => [w.id, w]))
  return remaining.flatMap((c) => {
    const word = byId.get(c.id)
    return word ? [{ word, isReview: c.isReview }] : []
  })
}

// --- storage (IndexedDB via the settings table) ---

export async function loadActiveSession(): Promise<SavedSession | null> {
  const { getSetting } = await import('@/db')
  return getSetting<SavedSession | null>(ACTIVE_SESSION_KEY, null)
}

export async function saveActiveSession(s: SavedSession): Promise<void> {
  const { setSetting } = await import('@/db')
  // plain copy: IndexedDB cannot store reactive proxies
  await setSetting(ACTIVE_SESSION_KEY, JSON.parse(JSON.stringify(s)))
}

export async function clearActiveSession(): Promise<void> {
  const { db } = await import('@/db')
  await db.settings.delete(ACTIVE_SESSION_KEY)
}
