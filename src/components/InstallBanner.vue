<script setup lang="ts">
import { useI18n } from 'vue-i18n'

// Shown on Home when the browser (Android Chrome etc.) allows installing the app
const emit = defineEmits<{ install: []; later: [] }>()
const { t } = useI18n()
const iconUrl = `${import.meta.env.BASE_URL}pwa-192x192.png`
</script>

<template>
  <section class="banner" role="status">
    <div class="head">
      <img :src="iconUrl" alt="" width="44" height="44" class="icon" />
      <div class="text">
        <h2>{{ t('install.title') }}</h2>
        <p>{{ t('install.subtitle') }}</p>
      </div>
    </div>
    <div class="actions">
      <button class="btn btn-primary" @click="emit('install')">{{ t('install.short') }}</button>
      <button class="btn later" @click="emit('later')">{{ t('install.later') }}</button>
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
  background: var(--c-surface);
  border: 2px solid var(--c-primary);
}

.head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon {
  flex: none;
  border-radius: 12px;
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
