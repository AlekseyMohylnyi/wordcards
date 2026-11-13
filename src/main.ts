import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/800.css'
import '@fontsource/nunito/900.css'
import './styles/theme.css'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'
import { requestPersistentStorage } from './db'
import { useSettingsStore } from './stores/settings'
import { watchColorScheme } from './theme'
import { initInstallPrompt } from './services/install'

// Catch Android's install offer as early as possible, before the app mounts
initInstallPrompt()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)

void requestPersistentStorage()
watchColorScheme()

// Production only (no service worker in `npm run dev`): keep all word files available offline
if (import.meta.env.PROD) {
  void import('./services/offline').then((m) => m.warmWordCache()).catch((e) => console.warn('Word cache warm-up failed', e))
}

// Mount after settings are read so the UI starts with the saved language and last choices
useSettingsStore()
  .load()
  .catch((e) => console.error('Failed to load settings', e))
  .finally(() => app.mount('#app'))
