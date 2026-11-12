import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

export const router = createRouter({
  // Hash mode so deep links work on GitHub Pages
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { tabs: true } },
    { path: '/session', name: 'session', component: () => import('@/views/SessionView.vue') },
    { path: '/summary', name: 'summary', component: () => import('@/views/SummaryView.vue') },
    { path: '/stats', name: 'stats', component: () => import('@/views/StatsView.vue'), meta: { tabs: true } },
    { path: '/words', name: 'words', component: () => import('@/views/WordsView.vue'), meta: { tabs: true } },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { tabs: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// After a new version is published, a page that is still running the old code may ask for
// a screen chunk that no longer exists. Reload once into the new version instead of breaking.
const CHUNK_RELOAD_KEY = 'chunk-reload-at'
router.onError((error, to) => {
  const message = String((error as Error)?.message ?? error)
  if (!/dynamically imported module|Importing a module script failed|error loading dynamically/i.test(message)) return
  let last = 0
  try {
    last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0)
    if (Date.now() - last < 10_000) return // already tried: avoid a reload loop
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
  } catch {
    // storage unavailable: still try once
  }
  window.location.hash = to.fullPath
  window.location.reload()
})
