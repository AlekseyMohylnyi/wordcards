<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { WordStatus } from '@/types'

const { t } = useI18n()
const tab = ref<WordStatus>('learned')
</script>

<template>
  <div class="page">
    <h1 class="page-title">{{ t('words.title') }}</h1>
    <div class="segmented" role="tablist">
      <button role="tab" :aria-selected="tab === 'learned'" :class="{ on: tab === 'learned' }" @click="tab = 'learned'">
        {{ t('words.learned') }}
      </button>
      <button role="tab" :aria-selected="tab === 'review'" :class="{ on: tab === 'review' }" @click="tab = 'review'">
        {{ t('words.review') }}
      </button>
    </div>
    <p class="card muted">{{ t('words.empty') }}</p>
  </div>
</template>

<style scoped>
.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  margin-bottom: 16px;
  background: var(--c-surface-2);
  border-radius: var(--radius-md);
}

.segmented button {
  border-radius: var(--radius-sm);
  font-weight: 800;
  color: var(--c-text-muted);
}

.segmented button.on {
  background: var(--c-surface);
  color: var(--c-primary);
  box-shadow: var(--c-shadow);
}
</style>
