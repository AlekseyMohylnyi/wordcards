/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

// GitHub Pages serves the app from /<repo-name>/
const base = '/wordcards/'
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

/** Short commit id of this build, shown in Settings so the user can tell versions apart */
function buildId(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'local'
  }
}

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  plugins: [
    vue(),
    VitePWA({
      // new version → "A new version is available → Update" banner (UpdateBanner.vue)
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: base,
        name: 'WordCards',
        short_name: 'WordCards',
        description: 'Вивчення англійських слів картками',
        lang: 'uk',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        theme_color: '#F5F3FF',
        background_color: '#F5F3FF',
        categories: ['education'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell (html, js, css, fonts, icons) is precached at install
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        // Word lists are not precached: served stale-while-revalidate (see below + services/offline.ts)
        globIgnores: ['**/words/*.json'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // take control on the very first visit so the word files can be cached right away
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /\/words\/[^/]+\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'words',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
