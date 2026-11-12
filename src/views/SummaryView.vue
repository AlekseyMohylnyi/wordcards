<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'
import { useStatsStore } from '@/stores/stats'
import ProgressRing from '@/components/ProgressRing.vue'

const { t } = useI18n()
const router = useRouter()
const session = useSessionStore()
const stats = useStatsStore()
const { settings } = useSettingsStore()

const goalLeft = computed(() => Math.max(0, settings.dailyGoal - stats.todayAnswered))

onMounted(() => {
  // Opened directly (e.g. after a reload) without a finished session
  if (session.answered === 0) {
    void router.replace({ name: 'home' })
    return
  }
  void stats.refresh()
})
</script>

<template>
  <div class="page summary">
    <div class="trophy" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="64" height="64">
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
    <h1 class="title">{{ session.mode === 'check' ? t('summary.checkTitle') : t('summary.title') }}</h1>
    <p class="muted sub">{{ t('summary.subtitle', { n: session.answered }) }}</p>

    <div class="results">
      <div class="result know">
        <strong>{{ session.known }}</strong>
        <span>{{ t('summary.known') }}</span>
      </div>
      <div class="result unknown">
        <strong>{{ session.unknown }}</strong>
        <span>{{ t('summary.unknown') }}</span>
      </div>
    </div>

    <div class="card stats">
      <div class="stat">
        <span class="label">{{ t('summary.streak') }}</span>
        <div class="streak">
          <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
            <path
              d="M12 22c4.4 0 7.5-3 7.5-7.3 0-4.6-3.6-7.4-5.4-12.2-2.8 2-4.6 5-4.3 8.2-1.4-.8-2.3-2.2-2.6-3.8C5.3 8.9 4.5 11.4 4.5 14.7 4.5 19 7.6 22 12 22z"
              fill="currentColor"
            />
          </svg>
          <strong>{{ stats.streak.current }}</strong>
        </div>
        <span class="small muted">{{ t('home.streakDays', stats.streak.current) }}</span>
      </div>
      <div class="stat">
        <span class="label">{{ t('summary.goal') }}</span>
        <ProgressRing
          :value="stats.todayAnswered"
          :max="settings.dailyGoal"
          :size="96"
          :stroke="11"
          :label="t('home.goalLabel', { done: stats.todayAnswered, goal: settings.dailyGoal })"
        >
          <strong class="ring-value">{{ stats.todayAnswered }}</strong>
          <small class="muted">{{ t('home.goalOf', { goal: settings.dailyGoal }) }}</small>
        </ProgressRing>
        <span class="small" :class="goalLeft ? 'muted' : 'goal-done'">
          {{ goalLeft ? t('summary.goalLeft', { n: goalLeft }) : t('summary.goalDone') }}
        </span>
      </div>
    </div>

    <RouterLink :to="{ name: 'home' }" class="btn btn-primary home-btn">{{ t('summary.toHome') }}</RouterLink>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100dvh;
  padding-bottom: calc(24px + var(--safe-bottom));
  text-align: center;
}

.trophy {
  display: grid;
  place-items: center;
  width: 104px;
  height: 104px;
  margin: 16px 0 12px;
  border-radius: 50%;
  background: var(--c-accent-soft);
  color: var(--c-flame);
}

.title {
  font-size: 1.9rem;
}

.sub {
  margin: 4px 0 20px;
}

.results {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
  margin-bottom: 16px;
}

.result {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  border: 3px solid;
  box-shadow: var(--c-shadow);
}

.result strong {
  font-size: 2.4rem;
  font-weight: 900;
  line-height: 1.1;
}

.result span {
  font-weight: 800;
}

.result.know {
  border-color: var(--c-know);
  color: var(--c-know-text);
}

.result.unknown {
  border-color: var(--c-unknown);
  color: var(--c-unknown-text);
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
  margin-bottom: 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.label {
  font-weight: 900;
}

.streak {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 96px;
  color: var(--c-flame);
}

.streak strong {
  font-size: 2.6rem;
  font-weight: 900;
  color: var(--c-text);
}

.ring-value {
  font-size: 1.5rem;
  font-weight: 900;
}

.small {
  font-size: 0.85rem;
}

.goal-done {
  color: var(--c-know-text);
  font-weight: 800;
}

.home-btn {
  width: 100%;
  min-height: 56px;
  font-size: 1.2rem;
  text-decoration: none;
  margin-top: auto;
}
</style>
