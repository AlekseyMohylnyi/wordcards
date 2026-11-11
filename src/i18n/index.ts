import { createI18n } from 'vue-i18n'
import uk from './uk.json'
import en from './en.json'

export type Locale = 'uk' | 'en'

export const i18n = createI18n({
  legacy: false,
  locale: 'uk',
  fallbackLocale: 'uk',
  messages: { uk, en },
})

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  document.documentElement.lang = locale
}
