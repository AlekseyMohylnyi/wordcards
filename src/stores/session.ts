import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { Level } from '@/types'
import { buildSession, loadLevel, type CategoryFilter, type SessionCard, type SessionPlan } from '@/services/wordSource'
import { recordAnswer } from '@/services/answers'
import {
  clearActiveSession,
  isResumable,
  loadActiveSession,
  restoreRemaining,
  saveActiveSession,
  toSavedCards,
  type SavedSession,
} from '@/services/activeSession'

export const useSessionStore = defineStore('session', () => {
  const level = ref<Level>('A1')
  const category = ref<CategoryFilter>('mix')
  // shallow: words stay plain objects (no deep proxies; they are saved to IndexedDB)
  const plan = shallowRef<SessionPlan | null>(null)
  /** Cards answered before a resumed session was reopened */
  const offset = ref(0)
  const index = ref(0)
  const known = ref(0)
  const unknown = ref(0)
  /** What is persisted for "continue"; the full original card list */
  let saved: SavedSession | null = null

  const cards = computed<SessionCard[]>(() => plan.value?.cards ?? [])
  const total = computed(() => offset.value + cards.value.length)
  const position = computed(() => offset.value + index.value)
  const current = computed(() => cards.value[index.value])
  const next = computed(() => cards.value[index.value + 1])
  const answered = computed(() => known.value + unknown.value)
  const done = computed(() => cards.value.length > 0 && index.value >= cards.value.length)

  function reset(l: Level, c: CategoryFilter) {
    level.value = l
    category.value = c
    plan.value = null
    offset.value = 0
    index.value = 0
    known.value = 0
    unknown.value = 0
    saved = null
  }

  /** Start a new session; an unfinished one is discarded (its answers stay saved). */
  async function start(l: Level, c: CategoryFilter, size: number) {
    reset(l, c)
    await clearActiveSession()
    const p = await buildSession(l, c, size)
    plan.value = p
    const now = Date.now()
    saved = { level: l, category: c, cards: toSavedCards(p.cards), index: 0, known: 0, unknown: 0, startedAt: now, updatedAt: now }
    return p
  }

  /** Reopen the unfinished session. Returns false if there is nothing to continue. */
  async function resume(): Promise<boolean> {
    const s = await loadActiveSession()
    if (!isResumable(s)) return false
    const remaining = await restoreRemaining(s, (l) => loadLevel(l))
    if (!remaining.length) {
      await clearActiveSession()
      return false
    }
    reset(s.level, s.category)
    saved = s
    offset.value = s.index
    known.value = s.known
    unknown.value = s.unknown
    plan.value = { cards: remaining, newWanted: 0, newAvailable: 0, reviewCount: 0, exhausted: false }
    return true
  }

  /** Save the answer for a card immediately (progress + today's activity). */
  async function answer(card: SessionCard, isKnown: boolean) {
    if (isKnown) known.value++
    else unknown.value++
    await recordAnswer(card.word, isKnown)
  }

  /** Move to the next card and remember where we are (or forget the session when it is over). */
  async function advance() {
    index.value++
    if (!saved) return
    if (done.value) {
      saved = null
      await clearActiveSession()
      return
    }
    saved = { ...saved, index: position.value, known: known.value, unknown: unknown.value, updatedAt: Date.now() }
    await saveActiveSession(saved)
  }

  return {
    level,
    category,
    plan,
    offset,
    index,
    known,
    unknown,
    cards,
    total,
    position,
    current,
    next,
    answered,
    done,
    start,
    resume,
    answer,
    advance,
  }
})
