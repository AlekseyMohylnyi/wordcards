import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/db'
import { localDateKey } from '@/services/date'
import { computeStreak, type StreakInfo } from '@/services/streak'

export const useStatsStore = defineStore('stats', () => {
  const todayAnswered = ref(0)
  const streak = ref<StreakInfo>({ current: 0, best: 0, todayDone: false })
  const loaded = ref(false)

  /** Re-read today's activity and the streak from IndexedDB. */
  async function refresh() {
    const today = localDateKey()
    const activity = await db.activity.toArray()
    const active = activity.filter((a) => a.answered > 0).map((a) => a.date)
    todayAnswered.value = activity.find((a) => a.date === today)?.answered ?? 0
    streak.value = computeStreak(active, today)
    loaded.value = true
  }

  return { todayAnswered, streak, loaded, refresh }
})
