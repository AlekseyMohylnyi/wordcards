import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { Level } from '@/types'
import { buildSession, type CategoryFilter, type SessionCard, type SessionPlan } from '@/services/wordSource'
import { recordAnswer } from '@/services/answers'

export const useSessionStore = defineStore('session', () => {
  const level = ref<Level>('A1')
  const category = ref<CategoryFilter>('mix')
  // shallow: words stay plain objects (no deep proxies; they are saved to IndexedDB)
  const plan = shallowRef<SessionPlan | null>(null)
  const index = ref(0)
  const known = ref(0)
  const unknown = ref(0)

  const cards = computed<SessionCard[]>(() => plan.value?.cards ?? [])
  const total = computed(() => cards.value.length)
  const current = computed(() => cards.value[index.value])
  const next = computed(() => cards.value[index.value + 1])
  const answered = computed(() => known.value + unknown.value)
  const done = computed(() => total.value > 0 && index.value >= total.value)

  async function start(l: Level, c: CategoryFilter, size: number) {
    level.value = l
    category.value = c
    plan.value = null
    index.value = 0
    known.value = 0
    unknown.value = 0
    plan.value = await buildSession(l, c, size)
    return plan.value
  }

  /** Save the answer for a card immediately (progress + today's activity). */
  async function answer(card: SessionCard, isKnown: boolean) {
    if (isKnown) known.value++
    else unknown.value++
    await recordAnswer(card.word, isKnown)
  }

  function advance() {
    index.value++
  }

  return { level, category, plan, index, known, unknown, cards, total, current, next, answered, done, start, answer, advance }
})
