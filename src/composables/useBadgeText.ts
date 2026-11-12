import { useI18n } from 'vue-i18n'
import type { BadgeDef } from '@/services/badges'

/** Localized title and condition for a badge. */
export function useBadgeText() {
  const { t } = useI18n()

  function title(b: BadgeDef): string {
    switch (b.kind) {
      case 'session':
        return t('badges.firstSession')
      case 'check':
        return t('badges.firstCheck')
      case 'learned':
        return t('badges.learnedTitle', b.threshold)
      case 'streak':
        return t('badges.streakTitle', b.threshold)
    }
  }

  function condition(b: BadgeDef): string {
    switch (b.kind) {
      case 'session':
        return t('badges.firstSessionCond')
      case 'check':
        return t('badges.firstCheckCond')
      case 'learned':
        return t('badges.learnedCond', b.threshold)
      case 'streak':
        return t('badges.streakCond', b.threshold)
    }
  }

  return { title, condition }
}
