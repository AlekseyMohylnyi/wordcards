import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import uk from './i18n/uk.json'
import en from './i18n/en.json'
import { ACCENTS, ACCENT_SWATCH, isAccent } from './theme'

const css = readFileSync(fileURLToPath(new URL('./styles/theme.css', import.meta.url)), 'utf-8')
const darkPart = css.slice(css.lastIndexOf('@media (prefers-color-scheme: dark)'))

// Every colour a theme must define so no screen falls back to violet
const REQUIRED = ['--c-bg', '--c-surface-2', '--c-border', '--c-text', '--c-text-muted', '--c-primary', '--c-primary-fill', '--c-hero', '--c-hero-2', '--c-heat-0', '--c-heat-4']

function block(source: string, accent: string): string {
  const start = source.indexOf(`:root[data-accent='${accent}']`)
  return start < 0 ? '' : source.slice(start, source.indexOf('}', start))
}

describe('colour themes', () => {
  it('validates names', () => {
    expect(isAccent('green')).toBe(true)
    expect(isAccent('pink')).toBe(false)
    expect(isAccent(undefined)).toBe(false)
  })

  it.each(ACCENTS.filter((a) => a !== 'violet'))('%s defines all colours for light and dark', (accent) => {
    const light = block(css, accent)
    const dark = block(darkPart, accent)
    expect(REQUIRED.filter((v) => !light.includes(`${v}:`))).toEqual([])
    expect(REQUIRED.filter((v) => !dark.includes(`${v}:`))).toEqual([])
  })

  it('every theme has a swatch and a name in both languages', () => {
    for (const a of ACCENTS) {
      expect(ACCENT_SWATCH[a]).toMatch(/^#[0-9a-f]{6}$/)
      expect((uk.themes as Record<string, string>)[a]).toBeTruthy()
      expect((en.themes as Record<string, string>)[a]).toBeTruthy()
    }
  })
})
