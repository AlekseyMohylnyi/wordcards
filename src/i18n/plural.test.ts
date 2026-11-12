import { describe, expect, it } from 'vitest'
import { i18n, ukPlural } from './index'

describe('ukPlural', () => {
  it.each([
    [1, 0],
    [21, 0],
    [101, 0],
    [2, 1],
    [3, 1],
    [4, 1],
    [22, 1],
    [0, 2],
    [5, 2],
    [11, 2],
    [12, 2],
    [14, 2],
    [20, 2],
    [25, 2],
    [111, 2],
  ])('%i → form %i', (n, form) => {
    expect(ukPlural(n, 3)).toBe(form)
  })

  it('formats real messages', () => {
    const { t } = i18n.global
    expect(t('home.newLeft', 1)).toBe('1 нове')
    expect(t('home.newLeft', 3)).toBe('3 нові')
    expect(t('home.newLeft', 560)).toBe('560 нових')
  })
})
