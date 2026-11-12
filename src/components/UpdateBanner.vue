<script setup lang="ts">
import { ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const CHECK_EVERY_MS = 60 * 60 * 1000

// The browser looks for a new service worker only when the app is (re)loaded.
// An installed iPhone app is usually resumed from the background instead, so we also check
// when it becomes visible again and once an hour while it stays open.
const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(swUrl, registration) {
    if (!registration) return
    let lastCheck = Date.now()

    const check = async () => {
      if (registration.installing || !navigator.onLine) return
      lastCheck = Date.now()
      try {
        // Skip if the server is unreachable (offline, captive portal)
        const res = await fetch(swUrl, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } })
        if (res.ok) await registration.update()
      } catch {
        // offline: try again next time
      }
    }

    document.addEventListener('visibilitychange', () => {
      // at most once a minute, so quick app switching does not spam the server
      if (document.visibilityState === 'visible' && Date.now() - lastCheck > 60_000) void check()
    })
    setInterval(() => void check(), CHECK_EVERY_MS)
  },
})

function dismiss() {
  needRefresh.value = false
}

/**
 * Activate the waiting service worker and reload into the new version.
 * We reload ourselves on `controllerchange` (with clientsClaim the plugin's own reload
 * does not always fire) and, as a last resort, after a few seconds.
 */
const updating = ref(false)
let reloaded = false
function reloadOnce() {
  if (reloaded) return
  reloaded = true
  window.location.reload()
}

function applyUpdate() {
  if (updating.value) return
  updating.value = true
  navigator.serviceWorker?.addEventListener('controllerchange', reloadOnce, { once: true })
  void updateServiceWorker(true)
  setTimeout(reloadOnce, 3000)
}
</script>

<template>
  <div v-if="needRefresh" class="update" role="status">
    <span>{{ t('update.available') }}</span>
    <button class="btn btn-primary small" :disabled="updating" @click="applyUpdate">{{ t('update.reload') }}</button>
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
