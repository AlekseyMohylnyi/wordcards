import { LEVELS, type Level, type Word } from '@/types'

const cache = new Map<Level, Promise<Word[]>>()

/** Load public/words/<level>.json (cached in memory; offline via service worker). */
export function loadLevel(level: Level): Promise<Word[]> {
  let p = cache.get(level)
  if (!p) {
    const url = `${import.meta.env.BASE_URL}words/${level.toLowerCase()}.json`
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`)
      return r.json() as Promise<Word[]>
    })
    p.catch(() => cache.delete(level))
    cache.set(level, p)
  }
  return p
}

/** Total number of words across all levels. */
export async function countAllWords(): Promise<number> {
  const lists = await Promise.all(LEVELS.map((l) => loadLevel(l).catch(() => [])))
  return lists.reduce((sum, list) => sum + list.length, 0)
}
