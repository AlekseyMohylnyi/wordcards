// Validates public/words/*.json against the format described in CLAUDE.md.
// Usage: npm run words:check
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CATEGORIES, LEVELS, POS, type Level } from '../src/types'

const wordsDir = fileURLToPath(new URL('../public/words/', import.meta.url))

const errors: string[] = []
const warnings: string[] = []
const seenIds = new Map<string, string>()
const seenWordPos = new Map<string, string>()
const perLevel: Record<string, number> = {}
const perCategory: Record<string, number> = {}

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const wordCount = (s: string) => s.trim().split(/\s+/).length

function expectedId(word: string, pos: string) {
  return `${word.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${pos}`
}

for (const level of LEVELS) {
  const file = `${level.toLowerCase()}.json`
  let data: unknown
  try {
    data = JSON.parse(readFileSync(wordsDir + file, 'utf-8'))
  } catch (e) {
    errors.push(`${file}: cannot read or parse (${(e as Error).message})`)
    continue
  }
  if (!Array.isArray(data)) {
    errors.push(`${file}: root must be an array`)
    continue
  }
  perLevel[level] = data.length

  data.forEach((raw, i) => {
    const w = raw as Record<string, unknown>
    const where = `${file}[${i}]${isStr(w?.id) ? ` (${w.id})` : ''}`
    const err = (msg: string) => errors.push(`${where}: ${msg}`)

    if (typeof w !== 'object' || w === null) return err('must be an object')

    const allowed = ['id', 'word', 'forms', 'ipa', 'pos', 'level', 'category', 'translation', 'synonyms', 'example', 'exampleUk']
    for (const k of Object.keys(w)) if (!allowed.includes(k)) err(`unknown field "${k}"`)

    for (const k of ['id', 'word', 'ipa', 'example', 'exampleUk']) if (!isStr(w[k])) err(`"${k}" must be a non-empty string`)

    if (!(POS as readonly string[]).includes(w.pos as string)) err(`invalid pos "${w.pos}"`)
    if (w.level !== level) err(`level "${w.level}" does not match file ${file}`)
    if (!(CATEGORIES as readonly string[]).includes(w.category as string)) err(`invalid category "${w.category}"`)

    if (isStr(w.id) && isStr(w.word) && isStr(w.pos)) {
      const exp = expectedId(w.word, w.pos)
      if (w.id !== exp) err(`id should be "${exp}"`)
      const prev = seenIds.get(w.id)
      if (prev) err(`duplicate id, already in ${prev}`)
      else seenIds.set(w.id, file)
      const key = `${w.word.toLowerCase()}|${w.pos}`
      const prevWp = seenWordPos.get(key)
      if (prevWp && prevWp !== w.id) err(`same word+pos already in ${prevWp}`)
      seenWordPos.set(key, w.id)
    }

    if (w.forms !== null) {
      if (!Array.isArray(w.forms) || w.forms.length !== 3 || !w.forms.every(isStr)) {
        err('"forms" must be null or exactly 3 strings')
      } else {
        if (w.pos !== 'verb') err('"forms" only allowed for verbs')
        if (w.forms[0] !== w.word) err('"forms[0]" must equal "word"')
      }
    }

    if (isStr(w.ipa) && !/^\/[^/]+\/$/.test(w.ipa)) err('"ipa" must be wrapped in slashes, e.g. /ɡəʊ/')

    if (!Array.isArray(w.translation) || w.translation.length < 1 || w.translation.length > 3 || !w.translation.every(isStr)) {
      err('"translation" must be 1–3 non-empty strings')
    }
    if (!Array.isArray(w.synonyms) || w.synonyms.length > 3 || !w.synonyms.every(isStr)) {
      err('"synonyms" must be an array of 0–3 strings')
    } else if (isStr(w.word) && w.synonyms.some((s) => s.toLowerCase() === (w.word as string).toLowerCase())) {
      err('"synonyms" must not contain the word itself')
    }

    if (isStr(w.example)) {
      const n = wordCount(w.example)
      if (n < 5 || n > 12) err(`"example" must be 5–12 words (has ${n})`)
      if (!/[.!?]$/.test(w.example.trim())) warnings.push(`${where}: example should end with punctuation`)
    }
    if (isStr(w.exampleUk) && /[a-zA-Z]{3,}/.test(w.exampleUk)) warnings.push(`${where}: exampleUk contains Latin letters`)

    if (isStr(w.category)) perCategory[w.category] = (perCategory[w.category] ?? 0) + 1
  })
}

const total = Object.values(perLevel).reduce((a, b) => a + b, 0)
console.log(`Words: ${total}`)
console.log('By level:   ' + LEVELS.map((l: Level) => `${l}=${perLevel[l] ?? 0}`).join('  '))
console.log('By category: ' + CATEGORIES.map((c) => `${c}=${perCategory[c] ?? 0}`).join('  '))

for (const w of warnings) console.warn(`warn  ${w}`)
for (const e of errors) console.error(`error ${e}`)

if (errors.length) {
  console.error(`\n✗ ${errors.length} error(s)`)
  process.exit(1)
}
console.log(`\n✓ OK${warnings.length ? ` (${warnings.length} warning(s))` : ''}`)
