<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Simple inline SVG paths (24x24, stroke icons)
const tabs = [
  { to: '/', label: 'tabs.learn', icon: 'M4 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4zM8 4h12v12' },
  { to: '/stats', label: 'tabs.stats', icon: 'M5 20V12M12 20V5M19 20v-9' },
  { to: '/words', label: 'tabs.words', icon: 'M5 6h14M5 12h14M5 18h9' },
  {
    to: '/settings',
    label: 'tabs.settings',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .2-1.4-1.4L16.8 5l-3-1-1 2h-1.6l-1-2-3 1 .2 1.8L6 8.2 4 8 3 11l2 1v1.6l-2 1 1 3 2-.2 1.4 1.4-.2 2 3 1 1-2h1.6l1 2 3-1-.2-2 1.4-1.4 2 .2 1-3-2-1z',
  },
]
</script>

<template>
  <nav class="tabbar" :aria-label="t('tabs.label')">
    <RouterLink v-for="tab in tabs" :key="tab.to" :to="tab.to" class="tab" exact-active-class="active">
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path :d="tab.icon" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span>{{ t(tab.label) }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  height: calc(var(--tabbar-h) + var(--safe-bottom));
  padding: 6px calc(8px + var(--safe-right)) var(--safe-bottom) calc(8px + var(--safe-left));
  background: var(--c-surface);
  border-top: 1px solid var(--c-border);
  box-shadow: 0 -4px 20px rgb(0 0 0 / 0.06);
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: var(--tap);
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--c-text-muted);
  text-decoration: none;
  border-radius: var(--radius-sm);
}

.tab.active {
  color: var(--c-primary);
}
</style>
