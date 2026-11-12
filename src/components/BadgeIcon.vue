<script setup lang="ts">
import type { BadgeKind } from '@/services/badges'

withDefaults(defineProps<{ kind: BadgeKind; earned?: boolean; size?: number }>(), { earned: true, size: 56 })

const PATHS: Record<BadgeKind, string> = {
  // star
  session: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  // open book
  learned: 'M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1zM12 6.5v13',
  // flame
  streak: 'M12 21c4 0 6.5-2.7 6.5-6.4 0-4-3.1-6.4-4.7-10.6-2.4 1.7-4 4.3-3.7 7.1-1.2-.7-2-1.9-2.3-3.3C6.3 9.1 5.5 11.3 5.5 14.6 5.5 18.3 8.1 21 12 21z',
  // check in circle
  check: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l2.8 2.8L16.5 9.5',
}
</script>

<template>
  <span class="badge-icon" :class="[kind, { earned }]" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true">
    <svg viewBox="0 0 24 24" :width="size * 0.52" :height="size * 0.52">
      <path :d="PATHS[kind]" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </span>
</template>

<style scoped>
.badge-icon {
  display: inline-grid;
  place-items: center;
  flex: none;
  border-radius: 50%;
  background: var(--c-surface-2);
  color: var(--c-text-muted);
}

.earned {
  color: #fff;
}

.earned.session {
  background: var(--c-badge-session);
}

.earned.learned {
  background: var(--c-primary-fill);
}

.earned.streak {
  background: var(--c-badge-streak);
}

.earned.check {
  background: var(--c-badge-check);
}
</style>
