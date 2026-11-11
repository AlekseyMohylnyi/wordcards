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

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)

void requestPersistentStorage()
void useSettingsStore().load()

app.mount('#app')
