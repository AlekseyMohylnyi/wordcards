// Guards that every interface text goes through vue-i18n and exists in both languages.
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import uk from './uk.json'
import en from './en.json'
import { CATEGORIES } from '@/types'

type Messages = { [key: string]: string | Messages }

function flatten(obj: Messages, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') out.set(key, v)
    else for (const [kk, vv] of flatten(v, key)) out.set(kk, vv)
  }
  return out
}

const ukKeys = flatten(uk as Messages)
const enKeys = flatten(en as Messages)

const placeholders = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort()

// --- source files (app code only; tests and i18n files are excluded) ---
const srcDir = fileURLToPath(new URL('..', import.meta.url))
const sources = (readdirSync(srcDir, { recursive: true }) as string[])
  .filter((f) => /\.(vue|ts)$/.test(f) && !/\.test\.ts$/.test(f) && !f.endsWith('.d.ts'))
  .map((f) => ({ file: relative(srcDir, join(srcDir, f)).replace(/\\/g, '/'), text: readFileSync(join(srcDir, f), 'utf-8') }))

describe('uk.json and en.json', () => {
  it('have exactly the same keys', () => {
    const onlyUk = [...ukKeys.keys()].filter((k) => !enKeys.has(k))
    const onlyEn = [...enKeys.keys()].filter((k) => !ukKeys.has(k))
    expect({ onlyUk, onlyEn }).toEqual({ onlyUk: [], onlyEn: [] })
  })

  it('have no empty messages', () => {
    const empty = [...ukKeys, ...enKeys].filter(([, v]) => !v.trim()).map(([k]) => k)
    expect(empty).toEqual([])
  })

  it('use the same {placeholders} in both languages', () => {
    const mismatched = [...ukKeys.keys()]
      .filter((k) => enKeys.has(k))
      .filter((k) => placeholders(ukKeys.get(k)!).join() !== placeholders(enKeys.get(k)!).join())
    expect(mismatched).toEqual([])
  })

  it('have a name for every category and "mix"', () => {
    const missing = ['mix', ...CATEGORIES].filter((c) => !ukKeys.has(`categories.${c}`) || !enKeys.has(`categories.${c}`))
    expect(missing).toEqual([])
  })
})

describe('source code', () => {
  it('only uses i18n keys that exist', () => {
    const missing: string[] = []
    for (const { file, text } of sources) {
      for (const m of text.matchAll(/\bt\(\s*['"]([\w.-]+)['"]/g)) {
        if (!ukKeys.has(m[1])) missing.push(`${file}: ${m[1]}`)
      }
      // dynamic keys like t(`categories.${c}`): the prefix must be a section
      for (const m of text.matchAll(/\bt\(\s*`([\w.]+)\.\$\{/g)) {
        if (![...ukKeys.keys()].some((k) => k.startsWith(`${m[1]}.`))) missing.push(`${file}: ${m[1]}.*`)
      }
    }
    expect(missing).toEqual([])
  })

  it('has no Ukrainian text outside the translation files', () => {
    const found = sources.flatMap(({ file, text }) =>
      text
        .split('\n')
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => /[Ѐ-ӿ]/.test(line))
        .map(({ line, i }) => `${file}:${i + 1}: ${line.trim()}`),
    )
    expect(found).toEqual([])
  })

  it('has no hard-coded words in templates (text nodes and static labels)', () => {
    const found: string[] = []
    for (const { file, text } of sources.filter((s) => s.file.endsWith('.vue'))) {
      const template = text.match(/<template>([\s\S]*)<\/template>/)?.[1] ?? ''
      // text between tags, without {{ interpolations }}
      const bare = template
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\{\{[\s\S]*?\}\}/g, ' ')
        // a tag, allowing ">" inside quoted attribute values (v-if="a > 0")
        .replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, '\n')
      for (const chunk of bare.split('\n')) {
        if (/\p{L}{2,}/u.test(chunk)) found.push(`${file}: text "${chunk.trim()}"`)
      }
      // static (not bound) user-facing attributes
      for (const m of template.matchAll(/(?<![:\w-])(placeholder|aria-label|title|alt)="([^"]*)"/g)) {
        if (/\p{L}{2,}/u.test(m[2])) found.push(`${file}: ${m[1]}="${m[2]}"`)
      }
    }
    expect(found).toEqual([])
  })
})
