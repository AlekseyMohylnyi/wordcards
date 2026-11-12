<script setup lang="ts">
import { useI18n } from 'vue-i18n'

// Shown on Home when learned words are due for a check (rule 10)
defineProps<{ count: number }>()
const emit = defineEmits<{ start: []; later: [] }>()
const { t } = useI18n()
</script>

<template>
  <section class="banner" role="status">
    <div class="text">
      <h2>{{ t('review.title', { n: count }) }}</h2>
      <p>{{ t('review.subtitle') }}</p>
    </div>
    <div class="actions">
      <button class="btn btn-primary" @click="emit('start')">{{ t('review.start') }}</button>
      <button class="btn later" @click="emit('later')">{{ t('review.later') }}</button>
    </div>
  </section>
</template>

<style scoped>
.banner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  margin-bottom: 16px;
  border-radius: var(--radius-lg);
  background: var(--c-accent-soft);
  border: 2px solid var(--c-accent);
}

h2 {
  font-size: 1.1rem;
}

p {
  margin: 4px 0 0;
  color: var(--c-text-muted);
}

.actions {
  display: flex;
  gap: 8px;
}

.later {
  color: var(--c-text-muted);
}
</style>
