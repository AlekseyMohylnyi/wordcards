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
