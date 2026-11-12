<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { localDateKey, parseDateKey } from '@/services/date'
import { computeStreak } from '@/services/streak'
import { BADGES, awardBadges, badgeValue, isEarned, loadBadgeContext, type BadgeContext } from '@/services/badges'
import {
  breakdownByCategory,
  breakdownByLevel,
  dailySeries,
  heatmapWeeks,
  loadStatsData,
  monthStarts,
  type HeatCell,
  type StatsData,
} from '@/services/stats'
import { useSettingsStore } from '@/stores/settings'
import { useBadgeText } from '@/composables/useBadgeText'
import ProgressRing from '@/components/ProgressRing.vue'
import BarChart, { type BarPoint } from '@/components/BarChart.vue'
import Heatmap from '@/components/Heatmap.vue'
import BadgeIcon from '@/components/BadgeIcon.vue'
import CategoryIcon from '@/components/CategoryIcon.vue'

const { t, locale } = useI18n()
const { settings } = useSettingsStore()
const badgeText = useBadgeText()

const data = ref<StatsData | null>(null)
const ctx = ref<BadgeContext | null>(null)
const range = ref<'week' | 'month'>('week')
const today = localDateKey()

onMounted(async () => {
  // Keep badges in sync even if the last session was left early
  await awardBadges().catch((e) => console.error(e))
  const [d, c] = await Promise.all([loadStatsData(), loadBadgeContext()])
  data.value = d
  ctx.value = c
})

// ---------- formatting ----------
const intlLocale = computed(() => (locale.value === 'uk' ? 'uk-UA' : 'en-GB'))
const fmtDay = computed(() => new Intl.DateTimeFormat(intlLocale.value, { weekday: 'short', day: 'numeric', month: 'long' }))
const fmtWeekday = computed(() => new Intl.DateTimeFormat(intlLocale.value, { weekday: 'short' }))
const fmtMonth = computed(() => new Intl.DateTimeFormat(intlLocale.value, { month: 'short' }))
const answersLabel = (n: number) => t('stats.answers', n)

// ---------- tiles ----------
const activity = computed(() => data.value?.activity ?? [])
const learned = computed(() => data.value?.progress.filter((p) => p.status === 'learned').length ?? 0)
const review = computed(() => data.value?.progress.filter((p) => p.status === 'review').length ?? 0)
const streak = computed(() =>
  computeStreak(
    activity.value.filter((a) => a.answered > 0).map((a) => a.date),
    today,
  ),
)
const todayAnswered = computed(() => activity.value.find((a) => a.date === today)?.answered ?? 0)

// ---------- activity chart ----------
const bars = computed<BarPoint[]>(() => {
  const days = range.value === 'week' ? 7 : 30
  const series = dailySeries(activity.value, today, days)
  return series.map((d, i) => {
    const date = parseDateKey(d.date)
    const showMonthLabel = i % 5 === (series.length - 1) % 5
    return {
      key: d.date,
      label: range.value === 'week' ? fmtWeekday.value.format(date) : showMonthLabel ? String(date.getDate()) : '',
      value: d.answered,
      title: fmtDay.value.format(date),
    }
  })
})

// ---------- heatmap ----------
const weeks = computed(() => heatmapWeeks(activity.value, today, settings.dailyGoal, 20))
const months = computed(() =>
  monthStarts(weeks.value).map((m) => ({ col: m.col, label: fmtMonth.value.format(new Date(2026, m.month, 1)) })),
)
const dayNames = computed(() =>
  Array.from({ length: 7 }, (_, i) => fmtWeekday.value.format(new Date(2026, 10, 9 + i))), // 2026-11-09 is a Monday
)
const describeDay = (c: HeatCell) => `${fmtDay.value.format(parseDateKey(c.date))}: ${answersLabel(c.answered)}`

// ---------- distributions ----------
const byLevel = computed(() => (data.value ? breakdownByLevel(data.value.progress, data.value.words) : []))
const byCategory = computed(() => (data.value ? breakdownByCategory(data.value.progress, data.value.words) : []))
const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0)

// ---------- badges ----------
const badges = computed(() =>
  BADGES.map((def) => {
    const earned = !!data.value?.earned.has(def.id) || (!!ctx.value && isEarned(def, ctx.value))
    const value = ctx.value ? Math.min(badgeValue(def.kind, ctx.value), def.threshold) : 0
    return { def, earned, value }
  }),
)
const earnedCount = computed(() => badges.value.filter((b) => b.earned).length)
</script>

<template>
  <div class="page stats">
    <h1 class="page-title">{{ t('stats.title') }}</h1>

    <p v-if="!data" class="muted">{{ t('stats.loading') }}</p>
    <template v-else>
      <p v-if="!activity.length" class="card hint">{{ t('stats.empty') }}</p>

      <!-- Tiles -->
      <div class="tiles">
        <RouterLink :to="{ name: 'words', query: { tab: 'learned' } }" class="tile link">
          <strong>{{ learned }}</strong>
          <span>{{ t('stats.learned') }}</span>
        </RouterLink>
        <RouterLink :to="{ name: 'words', query: { tab: 'review' } }" class="tile link">
          <strong>{{ review }}</strong>
          <span>{{ t('stats.review') }}</span>
        </RouterLink>
        <div class="tile">
          <strong class="flame">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M12 22c4.4 0 7.5-3 7.5-7.3 0-4.6-3.6-7.4-5.4-12.2-2.8 2-4.6 5-4.3 8.2-1.4-.8-2.3-2.2-2.6-3.8C5.3 8.9 4.5 11.4 4.5 14.7 4.5 19 7.6 22 12 22z" fill="currentColor" />
            </svg>
            {{ streak.current }}
          </strong>
          <span>{{ t('stats.streak') }} · {{ t('stats.days', streak.current) }}</span>
        </div>
        <div class="tile">
          <strong>{{ streak.best }}</strong>
          <span>{{ t('stats.best') }} · {{ t('stats.days', streak.best) }}</span>
        </div>
      </div>

      <!-- Daily goal -->
      <section class="card goal">
        <ProgressRing
          :value="todayAnswered"
          :max="settings.dailyGoal"
          :size="84"
          :stroke="10"
          :label="t('home.goalLabel', { done: todayAnswered, goal: settings.dailyGoal })"
        >
          <strong class="ring-value">{{ todayAnswered }}</strong>
          <small class="muted">{{ t('home.goalOf', { goal: settings.dailyGoal }) }}</small>
        </ProgressRing>
        <div>
          <h2 class="section-title">{{ t('stats.goal') }}</h2>
          <p class="muted">
            {{ todayAnswered >= settings.dailyGoal ? t('summary.goalDone') : t('summary.goalLeft', { n: settings.dailyGoal - todayAnswered }) }}
          </p>
        </div>
      </section>

      <!-- Activity -->
      <section class="card">
        <div class="section-head">
          <h2 class="section-title">{{ t('stats.activity') }}</h2>
          <div class="segmented" role="group" :aria-label="t('stats.activity')">
            <button :class="{ on: range === 'week' }" :aria-pressed="range === 'week'" @click="range = 'week'">{{ t('stats.week') }}</button>
            <button :class="{ on: range === 'month' }" :aria-pressed="range === 'month'" @click="range = 'month'">{{ t('stats.month') }}</button>
          </div>
        </div>
        <BarChart
          :points="bars"
          :label="range === 'week' ? t('stats.chartWeek') : t('stats.chartMonth')"
          :value-label="answersLabel"
        />
      </section>

      <!-- Calendar -->
      <section class="card">
        <h2 class="section-title">{{ t('stats.calendar') }}</h2>
        <p class="muted small">{{ t('stats.calendarHint') }}</p>
        <Heatmap
          :weeks="weeks"
          :months="months"
          :day-names="dayNames"
          :label="t('stats.calendar')"
          :less-label="t('stats.less')"
          :more-label="t('stats.more')"
          :describe="describeDay"
        />
      </section>

      <!-- By level -->
      <section class="card">
        <h2 class="section-title">{{ t('stats.byLevel') }}</h2>
        <ul class="rows">
          <li v-for="r in byLevel" :key="r.key" class="row">
            <span class="row-label level">{{ r.key }}</span>
            <span class="track" aria-hidden="true"><span class="fill" :style="{ width: `${pct(r.learned, r.total)}%` }" /></span>
            <span class="row-value">{{ r.total ? t('stats.ofTotal', { n: r.learned, total: r.total }) : t('home.levelSoon') }}</span>
          </li>
        </ul>
      </section>

      <!-- By category -->
      <section class="card">
        <h2 class="section-title">{{ t('stats.byCategory') }}</h2>
        <ul class="rows">
          <li v-for="r in byCategory" :key="r.key" class="row">
            <span class="row-label cat">
              <CategoryIcon :name="r.key" :size="18" />
              {{ t(`categories.${r.key}`) }}
            </span>
            <span class="track" aria-hidden="true"><span class="fill" :style="{ width: `${pct(r.learned, r.total)}%` }" /></span>
            <span class="row-value">{{ t('stats.ofTotal', { n: r.learned, total: r.total }) }}</span>
          </li>
        </ul>
      </section>

      <!-- Badges -->
      <section class="card">
        <div class="section-head">
          <h2 class="section-title">{{ t('badges.title') }}</h2>
          <span class="muted small">{{ t('badges.earnedCount', { n: earnedCount, total: badges.length }) }}</span>
        </div>
        <ul class="badges">
          <li v-for="b in badges" :key="b.def.id" class="badge" :class="{ earned: b.earned }">
            <BadgeIcon :kind="b.def.kind" :earned="b.earned" :size="52" />
            <strong>{{ badgeText.title(b.def) }}</strong>
            <span v-if="b.earned" class="small earned-label">{{ t('badges.earned') }}</span>
            <span v-else class="small muted">
              {{ badgeText.condition(b.def) }}
              <template v-if="b.def.threshold > 1"> · {{ b.value }}/{{ b.def.threshold }}</template>
            </span>
          </li>
        </ul>
      </section>

      <RouterLink :to="{ name: 'words' }" class="btn btn-primary to-words">{{ t('stats.toWords') }}</RouterLink>
    </template>
  </div>
</template>

<style scoped>
.stats > * + * {
  margin-top: 14px;
}

.hint {
  color: var(--c-text-muted);
}

.small {
  font-size: 0.82rem;
}

.section-title {
  font-size: 1.1rem;
  margin-bottom: 8px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.section-head .section-title {
  margin: 0;
}

/* ---------- tiles ---------- */
.tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  background: var(--c-surface);
  box-shadow: var(--c-shadow);
  color: var(--c-text);
  text-decoration: none;
}

.tile strong {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 1.9rem;
  font-weight: 900;
  line-height: 1.1;
}

.tile span {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--c-text-muted);
}

.tile.link {
  position: relative;
}

.tile.link::after {
  content: '›';
  position: absolute;
  top: 10px;
  right: 14px;
  font-size: 1.4rem;
  color: var(--c-text-muted);
}

.flame svg {
  color: var(--c-flame);
}

/* ---------- goal ---------- */
.goal {
  display: flex;
  align-items: center;
  gap: 16px;
}

.goal p {
  margin: 0;
}

.ring-value {
  font-size: 1.35rem;
  font-weight: 900;
}

/* ---------- segmented ---------- */
.segmented {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: var(--c-surface-2);
}

.segmented button {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--c-text-muted);
}

.segmented button.on {
  background: var(--c-surface);
  color: var(--c-text);
  box-shadow: var(--c-shadow);
}

/* ---------- horizontal bars ---------- */
.rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: 7.5rem 1fr auto;
  align-items: center;
  gap: 10px;
}

.row-label {
  font-weight: 800;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-label.level {
  font-weight: 900;
}

.row-label.cat {
  display: flex;
  align-items: center;
  gap: 6px;
}

.row-label.cat svg {
  flex: none;
  color: var(--c-primary);
}

.track {
  height: 10px;
  border-radius: 999px;
  background: var(--c-surface-2);
  overflow: hidden;
}

.fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--c-heat-3);
  transition: width 0.6s ease-out;
}

.row-value {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--c-text-muted);
  font-variant-numeric: tabular-nums;
  text-align: right;
  min-width: 4.5rem;
}

/* ---------- badges ---------- */
.badges {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}

.badge strong {
  font-size: 0.85rem;
  line-height: 1.15;
}

.badge:not(.earned) strong {
  color: var(--c-text-muted);
}

.badge .small {
  line-height: 1.2;
}

.earned-label {
  color: var(--c-know-text);
  font-weight: 800;
}

.to-words {
  display: flex;
  width: 100%;
  min-height: 52px;
  text-decoration: none;
}
</style>
