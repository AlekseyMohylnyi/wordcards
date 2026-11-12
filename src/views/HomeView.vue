<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { CATEGORIES, LEVELS, type Level } from '@/types'
import { getSeenIds } from '@/db'
import { countNewByLevel, type CategoryFilter, type LevelCount } from '@/services/wordSource'
import { isResumable, loadActiveSession, type SavedSession } from '@/services/activeSession'
import { loadCheckBannerState, snoozeCheckBanner, type CheckBannerState } from '@/services/review'
import { useSettingsStore } from '@/stores/settings'
import { useStatsStore } from '@/stores/stats'
import ProgressRing from '@/components/ProgressRing.vue'
import CategoryIcon from '@/components/CategoryIcon.vue'
import ReviewBanner from '@/components/ReviewBanner.vue'

const { t } = useI18n()
const router = useRouter()
const { settings } = useSettingsStore()
const stats = useStatsStore()

const categories: CategoryFilter[] = ['mix', ...CATEGORIES]
const counts = ref<Record<Level, LevelCount> | null>(null)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return t('home.greetingMorning')
  if (h >= 12 && h < 18) return t('home.greetingDay')
  if (h >= 18 && h < 23) return t('home.greetingEvening')
  return t('home.greetingNight')
})

// Unfinished session (user pressed "Finish" or closed the app mid-session)
const pending = ref<SavedSession | null>(null)
const pendingInfo = computed(() => {
  const p = pending.value
  if (!p) return ''
  return t('home.resumeInfo', {
    level: p.level,
    category: t(`categories.${p.category}`),
    done: p.index,
    total: p.cards.length,
  })
})

onMounted(async () => {
  void stats.refresh()
  void loadActiveSession().then((s) => {
    pending.value = isResumable(s) ? s : null
  })
  void loadCheckBannerState(settings.sessionSize).then((s) => {
    check.value = s
  })
  counts.value = await countNewByLevel(await getSeenIds())
})

function resume() {
  void router.push({ name: 'session', query: { resume: '1' } })
}

function levelHint(level: Level): string {
  const c = counts.value?.[level]
  if (!c) return '…'
  if (c.total === 0) return t('home.levelSoon')
  return t('home.newLeft', c.fresh)
}

const selectedCount = computed(() => counts.value?.[settings.lastLevel])
const startHint = computed(() => {
  const c = selectedCount.value
  if (!c) return ''
  if (c.total === 0) return t('home.levelEmpty')
  return ''
})
const canStart = computed(() => (selectedCount.value?.total ?? 0) > 0)

// Rule 10: "Check your learned words" banner
const check = ref<CheckBannerState>({ show: false, count: 0 })

function startCheck() {
  void router.push({ name: 'session', query: { mode: 'check' } })
}

async function checkLater() {
  check.value = { ...check.value, show: false }
  await snoozeCheckBanner()
}

function start() {
  void router.push({ name: 'session', query: { level: settings.lastLevel, category: settings.lastCategory } })
}
</script>

<template>
  <div class="page home">
    <header class="hero">
      <div class="hello">
        <h1>{{ greeting }}</h1>
        <p class="sub">{{ t('home.subtitle') }}</p>
        <div
          class="streak"
          :class="{ done: stats.streak.todayDone }"
          role="img"
          :aria-label="t('home.streakLabel', stats.streak.current)"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M12 22c4.4 0 7.5-3 7.5-7.3 0-4.6-3.6-7.4-5.4-12.2-2.8 2-4.6 5-4.3 8.2-1.4-.8-2.3-2.2-2.6-3.8C5.3 8.9 4.5 11.4 4.5 14.7 4.5 19 7.6 22 12 22z"
              fill="currentColor"
            />
          </svg>
          <strong>{{ stats.streak.current }}</strong>
          <span>{{ t('home.streakDays', stats.streak.current) }}</span>
        </div>
      </div>
      <ProgressRing
        :value="stats.todayAnswered"
        :max="settings.dailyGoal"
        :size="92"
        :stroke="10"
        color="var(--c-accent)"
        track-color="rgb(255 255 255 / 0.22)"
        :label="t('home.goalLabel', { done: stats.todayAnswered, goal: settings.dailyGoal })"
      >
        <strong class="ring-value">{{ stats.todayAnswered }}</strong>
        <small class="ring-goal">{{ t('home.goalOf', { goal: settings.dailyGoal }) }}</small>
      </ProgressRing>
    </header>

    <ReviewBanner v-if="check.show" :count="check.count" @start="startCheck" @later="checkLater" />

    <section class="block">
      <h2 class="section-title">{{ t('home.level') }}</h2>
      <div class="levels">
        <button
          v-for="l in LEVELS"
          :key="l"
          class="level"
          :class="{ selected: settings.lastLevel === l, empty: counts?.[l]?.total === 0 }"
          :aria-pressed="settings.lastLevel === l"
          @click="settings.lastLevel = l"
        >
          <span class="level-name">{{ l }}</span>
          <span class="level-hint">{{ levelHint(l) }}</span>
        </button>
      </div>
    </section>

    <section class="block">
      <h2 class="section-title">{{ t('home.category') }}</h2>
      <div class="tiles">
        <button
          v-for="c in categories"
          :key="c"
          class="tile"
          :class="{ selected: settings.lastCategory === c, mix: c === 'mix' }"
          :aria-pressed="settings.lastCategory === c"
          @click="settings.lastCategory = c"
        >
          <span class="tile-icon"><CategoryIcon :name="c" :size="22" /></span>
          <span class="tile-name">{{ t(`categories.${c}`) }}</span>
        </button>
      </div>
    </section>

    <div class="start-bar">
      <!-- Unfinished session: continue it or start a new one -->
      <template v-if="pending">
        <p class="start-hint pending-info">
          <strong>{{ t('home.resumeTitle') }}:</strong> {{ pendingInfo }}
        </p>
        <div class="start-pair">
          <button class="btn start-new" :disabled="!canStart" @click="start">{{ t('home.startNew') }}</button>
          <button class="btn btn-primary start" @click="resume">{{ t('home.continue') }}</button>
        </div>
      </template>
      <template v-else>
        <p v-if="startHint" class="start-hint">{{ startHint }}</p>
        <button class="btn btn-primary start" :disabled="!canStart" @click="start">{{ t('home.start') }}</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.home {
  /* room for the fixed Start button (and the "continue" line) */
  padding-bottom: 160px;
}

/* ---------- hero ---------- */
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--c-hero), var(--c-hero-2));
  color: var(--c-on-hero);
  box-shadow: var(--c-shadow);
}

.hello h1 {
  font-size: 1.6rem;
  line-height: 1.15;
}

.sub {
  margin: 4px 0 12px;
  opacity: 0.9;
}

.streak {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 6px 8px;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.16);
  font-size: 0.9rem;
}

.streak svg {
  color: rgb(255 255 255 / 0.55);
}

.streak.done svg {
  color: var(--c-flame);
  filter: drop-shadow(0 0 4px rgb(249 115 22 / 0.6));
}

.streak strong {
  font-size: 1.15rem;
  font-weight: 900;
}

.ring-value {
  font-size: 1.5rem;
  font-weight: 900;
}

.ring-goal {
  font-size: 0.75rem;
  opacity: 0.9;
}

/* ---------- sections ---------- */
.block {
  margin-bottom: 20px;
}

.section-title {
  font-size: 1.15rem;
  margin-bottom: 10px;
}

/* ---------- levels ---------- */
.levels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.level {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 64px;
  padding: 8px 4px;
  border-radius: var(--radius-md);
  background: var(--c-surface);
  border: 2px solid var(--c-border);
  box-shadow: var(--c-shadow);
}

.level-name {
  font-size: 1.3rem;
  font-weight: 900;
  color: var(--c-primary);
}

.level-hint {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--c-text-muted);
}

.level.empty .level-name {
  color: var(--c-text-muted);
}

.level.selected {
  background: var(--c-primary-fill);
  border-color: var(--c-primary-fill);
}

.level.selected .level-name,
.level.selected .level-hint {
  color: var(--c-on-primary);
}

/* ---------- category tiles ---------- */
.tiles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.tile {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 60px;
  padding: 10px 12px;
  text-align: left;
  border-radius: var(--radius-md);
  background: var(--c-surface);
  border: 2px solid transparent;
  box-shadow: var(--c-shadow);
}

.tile.mix {
  grid-column: 1 / -1;
}

.tile-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: var(--c-surface-2);
  color: var(--c-primary);
}

.tile-name {
  font-weight: 800;
  font-size: 0.98rem;
  line-height: 1.15;
}

.tile.selected {
  background: var(--c-primary-fill);
  color: var(--c-on-primary);
}

.tile.selected .tile-icon {
  background: rgb(255 255 255 / 0.2);
  color: var(--c-on-primary);
}

/* ---------- start ---------- */
.start-bar {
  position: fixed;
  z-index: 5;
  left: 0;
  right: 0;
  bottom: calc(var(--tabbar-h) + var(--safe-bottom));
  padding: 24px calc(16px + var(--safe-right)) 12px calc(16px + var(--safe-left));
  background: linear-gradient(to bottom, transparent, var(--c-bg) 40%);
  pointer-events: none;
}

.start-bar > * {
  max-width: 528px;
  margin-left: auto;
  margin-right: auto;
  pointer-events: auto;
}

.start {
  display: flex;
  width: 100%;
  min-height: 56px;
  font-size: 1.25rem;
}

.start:disabled {
  opacity: 0.5;
  cursor: default;
  box-shadow: none;
}

.start-hint {
  margin-bottom: 8px;
  text-align: center;
  font-size: 0.9rem;
  color: var(--c-text-muted);
}

.pending-info {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text);
  box-shadow: var(--c-shadow);
}

.start-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.start-pair .btn {
  padding-left: 10px;
  padding-right: 10px;
  white-space: nowrap;
}

.start-pair .start {
  font-size: 1.15rem;
}

.start-new {
  min-height: 56px;
  font-size: 1.05rem;
  background: var(--c-surface);
  color: var(--c-text);
  border: 2px solid var(--c-border);
  box-shadow: var(--c-shadow);
}

.start-new:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
