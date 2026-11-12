// Offline support for the word base.
// words/*.json are not precached; the service worker serves them stale-while-revalidate
// from the "words" cache. On the very first visit the page loads before the service worker
// takes control, so we fetch any level file that is not cached yet once it does.
import { LEVELS } from '@/types'
import { levelUrl } from './wordSource'

export const WORDS_CACHE = 'words'

/** Level files that are not in the words cache yet. */
export async function missingLevelUrls(base: string = import.meta.env.BASE_URL): Promise<string[]> {
  const urls = LEVELS.map((l) => new URL(levelUrl(l, base), location.origin).href)
  if (!('caches' in window)) return urls
  const cache = await caches.open(WORDS_CACHE)
  const present = await Promise.all(urls.map((u) => cache.match(u)))
  return urls.filter((_, i) => !present[i])
}

/** Make every level available offline (runs once the service worker controls the page). */
export async function warmWordCache(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  await navigator.serviceWorker.ready
  if (!navigator.serviceWorker.controller) {
    await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
  }
  const missing = await missingLevelUrls()
  // requests go through the service worker, which stores them in the words cache
  await Promise.all(missing.map((u) => fetch(u).catch(() => undefined)))
}
