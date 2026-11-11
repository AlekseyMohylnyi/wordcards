<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'
import { countAllWords } from '@/services/wordSource'

const { t } = useI18n()
const { settings } = useSettingsStore()
const version = __APP_VERSION__
const wordCount = ref<number | null>(null)

onMounted(async () => {
  wordCount.value = await countAllWords()
})
</script>

<template>
  <div class="page">
    <h1 class="page-title">{{ t('settings.title') }}</h1>

    <section class="card list">
      <label class="row">
        <span>{{ t('settings.language') }}</span>
        <select v-model="settings.locale">
          <option value="uk">Українська</option>
          <option value="en">English</option>
        </select>
      </label>
      <label class="row">
        <span>{{ t('settings.sessionSize') }}</span>
        <select v-model.number="settings.sessionSize">
          <option v-for="n in [10, 20, 30]" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
      <label class="row">
        <span>{{ t('settings.dailyGoal') }}</span>
        <select v-model.number="settings.dailyGoal">
          <option v-for="n in [10, 20, 30, 50]" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
      <label class="row">
        <span>{{ t('settings.voice') }}</span>
        <select v-model="settings.voice">
          <option value="en-US">{{ t('settings.voiceUS') }}</option>
          <option value="en-GB">{{ t('settings.voiceUK') }}</option>
        </select>
      </label>
      <label class="row">
        <span>{{ t('settings.rate') }}</span>
        <select v-model="settings.rate">
          <option value="normal">{{ t('settings.rateNormal') }}</option>
          <option value="slow">{{ t('settings.rateSlow') }}</option>
        </select>
      </label>
    </section>

    <section class="card list">
      <h2 class="section">{{ t('settings.about') }}</h2>
      <div class="row">
        <span>{{ t('settings.version') }}</span>
        <span class="muted">{{ version }}</span>
      </div>
      <div class="row">
        <span>{{ t('settings.wordsInBase') }}</span>
        <span class="muted">{{ wordCount ?? '…' }}</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.list {
  margin-bottom: 16px;
  padding: 8px 20px;
}

.section {
  font-size: 1.05rem;
  padding: 12px 0 4px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  border-bottom: 1px solid var(--c-border);
}

.row:last-child {
  border-bottom: none;
}

select {
  font: inherit;
  font-weight: 800;
  color: var(--c-primary);
  background: var(--c-surface-2);
  border: none;
  border-radius: var(--radius-sm);
  min-height: var(--tap);
  padding: 0 12px;
  max-width: 55%;
}
</style>
