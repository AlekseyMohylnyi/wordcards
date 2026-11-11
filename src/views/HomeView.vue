<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CATEGORIES, LEVELS, type Category, type Level } from '@/types'

const { t } = useI18n()

const level = ref<Level>('A1')
const category = ref<Category | 'mix'>('mix')
const categories: (Category | 'mix')[] = ['mix', ...CATEGORIES]
</script>

<template>
  <div class="page">
    <h1 class="page-title">{{ t('home.title') }}</h1>

    <section class="card block">
      <h2 class="label">{{ t('home.level') }}</h2>
      <div class="chips levels">
        <button
          v-for="l in LEVELS"
          :key="l"
          class="chip"
          :class="{ selected: level === l }"
          :aria-pressed="level === l"
          @click="level = l"
        >
          {{ l }}
        </button>
      </div>
    </section>

    <section class="card block">
      <h2 class="label">{{ t('home.category') }}</h2>
      <div class="chips">
        <button
          v-for="c in categories"
          :key="c"
          class="chip"
          :class="{ selected: category === c }"
          :aria-pressed="category === c"
          @click="category = c"
        >
          {{ t(`categories.${c}`) }}
        </button>
      </div>
    </section>

    <button class="btn btn-primary start" disabled>{{ t('home.start') }}</button>
    <p class="muted hint">{{ t('home.comingSoon') }}</p>
  </div>
</template>

<style scoped>
.block {
  margin-bottom: 16px;
}

.label {
  font-size: 1.05rem;
  margin-bottom: 12px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.levels {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
}

.chip {
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--c-surface-2);
  font-weight: 800;
}

.chip.selected {
  background: var(--c-primary);
  color: var(--c-on-primary);
}

.start {
  width: 100%;
  font-size: 1.25rem;
  padding: 16px;
}

.start:disabled {
  opacity: 0.55;
  cursor: default;
}

.hint {
  text-align: center;
}
</style>
