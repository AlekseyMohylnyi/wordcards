<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { CATEGORIES, LEVELS, type Level } from '@/types'
import type { CategoryFilter } from '@/services/wordSource'
import { isSpeechSupported, speak, speechText } from '@/services/speech'
import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'
import WordCard from '@/components/WordCard.vue'
import SwipeCard, { type SwipeDir } from '@/components/SwipeCard.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const { settings } = useSettingsStore()

type Phase = 'loading' | 'exhausted' | 'playing' | 'error'
const phase = ref<Phase>('loading')
const flipped = ref(false)
const busy = ref(false)
const saveError = ref(false)
const swipe = ref<InstanceType<typeof SwipeCard>>()
const canSpeak = isSpeechSupported()

const level = computed<Level>(() => {
  const q = String(route.query.level ?? '')
  return (LEVELS as readonly string[]).includes(q) ? (q as Level) : settings.lastLevel
})
const category = computed<CategoryFilter>(() => {
  const q = String(route.query.category ?? '')
  return q === 'mix' || (CATEGORIES as readonly string[]).includes(q) ? (q as CategoryFilter) : settings.lastCategory
})

const position = computed(() => Math.min(session.position + 1, session.total))
const progressPct = computed(() => (session.total ? (session.position / session.total) * 100 : 0))

async function load() {
  phase.value = 'loading'
  try {
    if (route.query.resume === '1' && (await session.resume())) {
      phase.value = 'playing'
      return
    }
    const plan = await session.start(level.value, category.value, settings.sessionSize)
    phase.value = plan.exhausted || plan.cards.length === 0 ? 'exhausted' : 'playing'
  } catch (e) {
    console.error(e)
    phase.value = 'error'
  }
}

async function decide(dir: SwipeDir) {
  const card = session.current
  if (busy.value || !card || phase.value !== 'playing') return
  busy.value = true
  const save = session.answer(card, dir === 'right').catch((e) => {
    console.error(e)
    saveError.value = true
  })
  await swipe.value?.fly(dir)
  await save
  flipped.value = false
  // remembers the position for "continue" on the Home screen
  const progressSaved = session.advance().catch((e) => console.error('Failed to save session position', e))
  busy.value = false
  if (session.done) {
    await progressSaved
    void router.replace({ name: 'summary' })
  }
}

function toggleFlip() {
  if (!busy.value) flipped.value = !flipped.value
}

function sayWord() {
  const w = session.current?.word
  if (w) speak(speechText(w.word, w.forms), settings.voice, settings.rate === 'slow' ? 0.75 : 1)
}

function finish() {
  void router.push({ name: 'home' })
}

function onKey(e: KeyboardEvent) {
  if (phase.value !== 'playing') return
  if (e.key === 'ArrowRight') decide('right')
  else if (e.key === 'ArrowLeft') decide('left')
  else if (e.key === ' ' || e.key === 'Enter') {
    if ((e.target as Element).closest('button')) return
    e.preventDefault()
    toggleFlip()
  }
}

onMounted(() => {
  void load()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="session">
    <!-- Playing -->
    <template v-if="phase === 'playing'">
      <header class="top">
        <div class="count" :aria-label="t('session.progress', { current: position, total: session.total })">
          <strong>{{ position }}</strong> / {{ session.total }}
        </div>
        <div class="bar" aria-hidden="true"><div class="bar-fill" :style="{ width: `${progressPct}%` }" /></div>
      </header>

      <div class="deck">
        <div v-if="session.next" :key="`under-${session.next.word.id}`" class="slot under" aria-hidden="true">
          <WordCard :word="session.next.word" :is-review="session.next.isReview" :can-speak="canSpeak" />
        </div>
        <div v-if="session.current" :key="session.current.word.id" class="slot top">
          <SwipeCard ref="swipe" :disabled="busy" @swipe="decide" @tap="toggleFlip">
            <WordCard
              :word="session.current.word"
              :is-review="session.current.isReview"
              :flipped="flipped"
              :can-speak="canSpeak"
              @speak="sayWord"
            />
          </SwipeCard>
        </div>
      </div>

      <p v-if="saveError" class="save-error" role="alert">{{ t('session.saveError') }}</p>

      <div class="answers">
        <button class="answer unknown" :disabled="busy" @click="decide('left')">
          <span class="answer-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>
          </span>
          {{ t('session.dontKnow') }}
        </button>
        <button class="answer know" :disabled="busy" @click="decide('right')">
          <span class="answer-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </span>
          {{ t('session.know') }}
        </button>
      </div>
      <button class="btn finish" @click="finish">{{ t('session.finish') }}</button>
    </template>

    <!-- Loading -->
    <div v-else-if="phase === 'loading'" class="center">
      <p class="muted">{{ t('session.loading') }}</p>
    </div>

    <!-- Not enough new words (rule 11) -->
    <div v-else-if="phase === 'exhausted'" class="center">
      <div class="card notice">
        <svg viewBox="0 0 24 24" width="56" height="56" aria-hidden="true" class="notice-icon">
          <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 9h.01M16 9h.01M8 15.5h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <h1>{{ t('session.exhaustedTitle') }}</h1>
        <p class="muted">
          {{ session.cards.length ? t('session.exhaustedText', { n: session.plan?.newAvailable ?? 0 }) : t('session.emptyText') }}
        </p>
        <div class="notice-actions">
          <button v-if="session.cards.length" class="btn btn-primary" @click="phase = 'playing'">
            {{ t('session.playAvailable', { n: session.cards.length }) }}
          </button>
          <button class="btn secondary" @click="finish">{{ t('session.chooseOther') }}</button>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else class="center">
      <div class="card notice">
        <p>{{ t('session.loadError') }}</p>
        <div class="notice-actions">
          <button class="btn btn-primary" @click="load">{{ t('session.retry') }}</button>
          <button class="btn secondary" @click="finish">{{ t('session.backHome') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.session {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  max-width: 560px;
  margin: 0 auto;
  padding: calc(12px + var(--safe-top)) calc(16px + var(--safe-right)) calc(8px + var(--safe-bottom)) calc(16px + var(--safe-left));
  overflow: hidden;
}

/* ---------- progress ---------- */
.top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.count {
  flex: none;
  min-width: 64px;
  font-size: 1.05rem;
  color: var(--c-text-muted);
}

.count strong {
  font-size: 1.35rem;
  font-weight: 900;
  color: var(--c-text);
}

.bar {
  flex: 1;
  height: 12px;
  border-radius: 999px;
  background: var(--c-surface-2);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--c-primary), var(--c-know));
  transition: width 0.35s ease-out;
}

/* ---------- card deck ---------- */
.deck {
  position: relative;
  flex: 1;
  min-height: 300px;
  margin-bottom: 16px;
}

.slot {
  position: absolute;
  inset: 0;
}

.slot.under {
  transform: translateY(14px) scale(0.94);
  opacity: 0.7;
  pointer-events: none;
}

/* The next card rises from underneath when it becomes the top card */
.slot.top {
  animation: rise 0.28s ease-out;
  z-index: 1;
}

@keyframes rise {
  from {
    transform: translateY(14px) scale(0.94);
  }
  to {
    transform: none;
  }
}

/* ---------- answer buttons ---------- */
.answers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.answer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 64px;
  border-radius: var(--radius-md);
  font-size: 1.12rem;
  font-weight: 900;
  border: 3px solid;
  background: var(--c-surface);
  box-shadow: var(--c-shadow);
}

.answer:active:not(:disabled) {
  transform: scale(0.97);
}

.answer-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  color: #fff;
}

.answer.unknown {
  border-color: var(--c-unknown);
  color: var(--c-unknown-text);
}

.answer.unknown .answer-icon {
  background: var(--c-unknown);
}

.answer.know {
  border-color: var(--c-know);
  color: var(--c-know-text);
}

.answer.know .answer-icon {
  background: var(--c-know);
}

.finish {
  width: 100%;
  min-height: 48px;
  margin-top: 10px;
  padding: 8px 20px;
  font-size: 1rem;
  background: var(--c-surface-2);
  color: var(--c-text);
}

.finish:active {
  transform: scale(0.98);
}

.save-error {
  margin: -8px 0 8px;
  text-align: center;
  color: var(--c-unknown-text);
  font-size: 0.9rem;
}

/* ---------- notices ---------- */
.center {
  flex: 1;
  display: grid;
  place-items: center;
}

.notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  padding: 28px 22px;
}

.notice-icon {
  color: var(--c-primary);
}

.notice h1 {
  font-size: 1.4rem;
  line-height: 1.2;
}

.notice p {
  margin: 0;
}

.notice-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 8px;
}

.secondary {
  background: var(--c-surface-2);
  color: var(--c-text);
}
</style>
