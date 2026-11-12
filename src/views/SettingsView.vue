<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { LEVELS, type Level } from '@/types'
import { useSettingsStore, type Settings } from '@/stores/settings'
import { loadLevel } from '@/services/wordSource'
import { isSpeechSupported, speak } from '@/services/speech'
import { getSetting, setSetting } from '@/db'
import { DEV_FORCE_CHECK_KEY } from '@/services/review'
import OptionGroup from '@/components/OptionGroup.vue'

const { t } = useI18n()
const { settings } = useSettingsStore()
const version = __APP_VERSION__
const buildId = __BUILD_ID__
const canSpeak = isSpeechSupported()

// ---------- options ----------
// Language names are written in their own language, so they stay the same in both locales
const localeOptions = computed(() => [
  { value: 'uk' as const, label: t('settings.langUk'), lang: 'uk' },
  { value: 'en' as const, label: t('settings.langEn'), lang: 'en' },
])
const sessionOptions = [10, 20, 30].map((n) => ({ value: n as Settings['sessionSize'], label: String(n) }))
const goalOptions = [10, 20, 30, 50].map((n) => ({ value: n as Settings['dailyGoal'], label: String(n) }))
const voiceOptions = computed(() => [
  { value: 'en-US' as const, label: t('settings.voiceUS') },
  { value: 'en-GB' as const, label: t('settings.voiceUK') },
])
const rateOptions = computed(() => [
  { value: 'normal' as const, label: t('settings.rateNormal') },
  { value: 'slow' as const, label: t('settings.rateSlow') },
])

function playSample() {
  speak('Hello! This is how your English words will sound.', settings.voice, settings.rate === 'slow' ? 0.75 : 1)
}

// ---------- about: words per level ----------
const perLevel = ref<Record<Level, number> | null>(null)
const totalWords = computed(() => (perLevel.value ? Object.values(perLevel.value).reduce((a, b) => a + b, 0) : null))

// ---------- developer options: only in `npm run dev`, stripped from the production build ----------
const isDev = import.meta.env.DEV
const forceCheckBanner = ref(false)
const devMessage = ref('')

async function setForceCheckBanner(value: boolean) {
  forceCheckBanner.value = value
  await setSetting(DEV_FORCE_CHECK_KEY, value)
}

async function fillDemo() {
  if (!import.meta.env.DEV || !window.confirm(t('settings.devDemoConfirm'))) return
  const { fillDemoData } = await import('@/services/demo')
  await fillDemoData()
  devMessage.value = t('settings.devDone')
}

async function clearData() {
  if (!import.meta.env.DEV || !window.confirm(t('settings.devClearConfirm'))) return
  const { clearLearningData } = await import('@/services/demo')
  await clearLearningData()
  devMessage.value = t('settings.devDone')
}

onMounted(async () => {
  if (isDev) forceCheckBanner.value = await getSetting(DEV_FORCE_CHECK_KEY, false)
  const counts = await Promise.all(LEVELS.map((l) => loadLevel(l).then((w) => w.length).catch(() => 0)))
  perLevel.value = Object.fromEntries(LEVELS.map((l, i) => [l, counts[i]])) as Record<Level, number>
})
</script>

<template>
  <div class="page settings">
    <h1 class="page-title">{{ t('settings.title') }}</h1>

    <!-- Interface -->
    <section class="card group">
      <div class="field">
        <span class="field-label">{{ t('settings.language') }}</span>
        <OptionGroup v-model="settings.locale" :options="localeOptions" :label="t('settings.language')" />
      </div>
    </section>

    <!-- Learning -->
    <section class="card group">
      <h2 class="group-title">{{ t('settings.learning') }}</h2>
      <div class="field">
        <span class="field-label">{{ t('settings.sessionSize') }}</span>
        <OptionGroup v-model="settings.sessionSize" :options="sessionOptions" :label="t('settings.sessionSize')" />
        <span class="field-hint">{{ t('settings.sessionSizeHint') }}</span>
      </div>
      <div class="field">
        <span class="field-label">{{ t('settings.dailyGoal') }}</span>
        <OptionGroup v-model="settings.dailyGoal" :options="goalOptions" :label="t('settings.dailyGoal')" />
        <span class="field-hint">{{ t('settings.dailyGoalHint') }}</span>
      </div>
    </section>

    <!-- Pronunciation -->
    <section class="card group">
      <h2 class="group-title">{{ t('settings.voice') }}</h2>
      <div class="field">
        <span class="field-label">{{ t('settings.accent') }}</span>
        <OptionGroup v-model="settings.voice" :options="voiceOptions" :label="t('settings.accent')" />
      </div>
      <div class="field">
        <span class="field-label">{{ t('settings.rate') }}</span>
        <OptionGroup v-model="settings.rate" :options="rateOptions" :label="t('settings.rate')" />
      </div>
      <button v-if="canSpeak" class="btn sample" @click="playSample">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
          <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        {{ t('settings.sample') }}
      </button>
      <p v-else class="field-hint">{{ t('settings.noSpeech') }}</p>
    </section>

    <!-- About -->
    <section class="card group about">
      <h2 class="group-title">{{ t('settings.about') }}</h2>
      <div class="row">
        <span>{{ t('settings.version') }}</span>
        <span class="value">{{ version }} <span class="muted">· {{ buildId }}</span></span>
      </div>
      <div class="row">
        <span>{{ t('settings.wordsInBase') }}</span>
        <span class="value">{{ totalWords ?? '…' }}</span>
      </div>
      <ul class="levels">
        <li v-for="l in LEVELS" :key="l" :class="{ empty: perLevel && !perLevel[l] }">
          <strong>{{ l }}</strong>
          <span>{{ perLevel ? (perLevel[l] || '—') : '…' }}</span>
        </li>
      </ul>
      <p class="field-hint">{{ t('settings.privacy') }}</p>
    </section>

    <!-- Developer -->
    <section v-if="isDev" class="card group dev">
      <h2 class="group-title">{{ t('settings.dev') }}</h2>
      <label class="row">
        <span>{{ t('settings.devForceCheck') }}</span>
        <input
          type="checkbox"
          class="toggle"
          :checked="forceCheckBanner"
          @change="setForceCheckBanner(($event.target as HTMLInputElement).checked)"
        />
      </label>
      <div class="dev-actions">
        <button class="btn btn-primary" @click="fillDemo">{{ t('settings.devDemo') }}</button>
        <button class="btn dev-clear" @click="clearData">{{ t('settings.devClear') }}</button>
      </div>
      <p v-if="devMessage" class="muted" role="status">{{ devMessage }}</p>
    </section>
  </div>
</template>

<style scoped>
.group {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 14px;
}

.group-title {
  font-size: 1.1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-weight: 800;
}

.field-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--c-text-muted);
}

.sample {
  align-self: flex-start;
  background: var(--c-surface-2);
  color: var(--c-text);
}

.sample svg {
  color: var(--c-primary);
}

/* ---------- about ---------- */
.about {
  gap: 10px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
}

.value {
  font-weight: 800;
}

.levels {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.levels li {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 2px;
  border-radius: var(--radius-sm);
  background: var(--c-surface-2);
  font-size: 0.85rem;
}

.levels strong {
  color: var(--c-primary);
  font-weight: 900;
}

.levels li.empty strong,
.levels li.empty span {
  color: var(--c-text-muted);
}

/* ---------- developer ---------- */
.dev {
  border: 2px dashed var(--c-accent);
}

.dev-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dev-clear {
  background: var(--c-surface-2);
  color: var(--c-text);
}

.toggle {
  width: 28px;
  height: 28px;
  accent-color: var(--c-primary-fill);
}
</style>
