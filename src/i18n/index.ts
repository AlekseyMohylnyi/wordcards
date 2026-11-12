import { createI18n } from 'vue-i18n'
import uk from './uk.json'
import en from './en.json'

export type Locale = 'uk' | 'en'

/**
 * Ukrainian plural forms for "a | b | c" messages:
 * 1, 21, 31… → a;  2–4, 22–24… → b;  0, 5–20, 25–30… → c
 */
export function ukPlural(choice: number, choicesLength: number): number {
  if (choicesLength < 3) return choice === 1 ? 0 : 1
  const n = Math.abs(choice)
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 0
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 1
  return 2
}

export const i18n = createI18n({
  legacy: false,
  locale: 'uk',
  fallbackLocale: 'uk',
  messages: { uk, en },
  pluralRules: { uk: ukPlural },
})

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  document.documentElement.lang = locale
}
