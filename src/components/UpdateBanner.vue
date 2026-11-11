<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { needRefresh, updateServiceWorker } = useRegisterSW()

function dismiss() {
  needRefresh.value = false
}
</script>

<template>
  <div v-if="needRefresh" class="update" role="status">
    <span>{{ t('update.available') }}</span>
    <button class="btn btn-primary small" @click="updateServiceWorker(true)">{{ t('update.reload') }}</button>
    <button class="close" :aria-label="t('update.dismiss')" @click="dismiss">✕</button>
  </div>
</template>

<style scoped>
.update {
  position: fixed;
  z-index: 20;
  top: calc(8px + var(--safe-top));
  left: calc(12px + var(--safe-left));
  right: calc(12px + var(--safe-right));
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 8px 16px;
  background: var(--c-surface);
  border: 2px solid var(--c-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--c-shadow);
}

.update span {
  flex: 1;
  font-weight: 800;
}

.small {
  padding: 8px 14px;
  font-size: 0.95rem;
}

.close {
  color: var(--c-text-muted);
  border-radius: var(--radius-sm);
}
</style>
