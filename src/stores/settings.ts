import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import { getSetting, setSetting } from '@/db'
import { setLocale, type Locale } from '@/i18n'
import type { Level } from '@/types'
import type { CategoryFilter } from '@/services/wordSource'

export interface Settings {
  locale: Locale
  sessionSize: 10 | 20 | 30
  dailyGoal: 10 | 20 | 30 | 50
  voice: 'en-US' | 'en-GB'
  rate: 'normal' | 'slow'
  /** Last level / category chosen on the Home screen */
  lastLevel: Level
  lastCategory: CategoryFilter
}

export const DEFAULT_SETTINGS: Settings = {
  locale: 'uk',
  sessionSize: 20,
  dailyGoal: 20,
  voice: 'en-US',
  rate: 'normal',
  lastLevel: 'A1',
  lastCategory: 'mix',
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = reactive<Settings>({ ...DEFAULT_SETTINGS })
  const loaded = ref(false)

  async function load() {
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      ;(settings as Record<string, unknown>)[key] = await getSetting(key, DEFAULT_SETTINGS[key])
    }
    setLocale(settings.locale)
    loaded.value = true
  }

  // Persist each change after initial load
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    watch(
      () => settings[key],
      (value) => {
        if (!loaded.value) return
        void setSetting(key, value)
        if (key === 'locale') setLocale(value as Locale)
      },
    )
  }

  return { settings, loaded, load }
})
