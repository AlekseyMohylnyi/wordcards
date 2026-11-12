// Validates public/words/*.json against the format described in CLAUDE.md.
// Usage: npm run words:check
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CATEGORIES, LEVELS, POS } from '../src/types'

// ---------------------------------------------------------------------------
// Common irregular verbs: base -> [past, past participle].
// Alternatives are separated by "|" (British and American spellings, etc.).
// If a verb from this list is in the base, its "forms" are required and must match.
// ---------------------------------------------------------------------------
const IRREGULAR_VERBS: Record<string, [string, string]> = {
  arise: ['arose', 'arisen'],
  awake: ['awoke', 'awoken'],
  be: ['was/were', 'been'],
  bear: ['bore', 'born|borne'],
  beat: ['beat', 'beaten'],
  become: ['became', 'become'],
  begin: ['began', 'begun'],
  bend: ['bent', 'bent'],
  bet: ['bet', 'bet'],
  bind: ['bound', 'bound'],
  bite: ['bit', 'bitten'],
  bleed: ['bled', 'bled'],
  blow: ['blew', 'blown'],
  break: ['broke', 'broken'],
  breed: ['bred', 'bred'],
  bring: ['brought', 'brought'],
  broadcast: ['broadcast', 'broadcast'],
  build: ['built', 'built'],
  burn: ['burnt|burned', 'burnt|burned'],
  burst: ['burst', 'burst'],
  buy: ['bought', 'bought'],
  cast: ['cast', 'cast'],
  catch: ['caught', 'caught'],
  choose: ['chose', 'chosen'],
  cling: ['clung', 'clung'],
  come: ['came', 'come'],
  cost: ['cost', 'cost'],
  creep: ['crept', 'crept'],
  cut: ['cut', 'cut'],
  deal: ['dealt', 'dealt'],
  dig: ['dug', 'dug'],
  do: ['did', 'done'],
  draw: ['drew', 'drawn'],
  dream: ['dreamt|dreamed', 'dreamt|dreamed'],
  drink: ['drank', 'drunk'],
  drive: ['drove', 'driven'],
  eat: ['ate', 'eaten'],
  fall: ['fell', 'fallen'],
  feed: ['fed', 'fed'],
  feel: ['felt', 'felt'],
  fight: ['fought', 'fought'],
  find: ['found', 'found'],
  fit: ['fitted|fit', 'fitted|fit'],
  flee: ['fled', 'fled'],
  fly: ['flew', 'flown'],
  forbid: ['forbade', 'forbidden'],
  forecast: ['forecast', 'forecast'],
  forget: ['forgot', 'forgotten'],
  forgive: ['forgave', 'forgiven'],
  freeze: ['froze', 'frozen'],
  get: ['got', 'got|gotten'],
  give: ['gave', 'given'],
  go: ['went', 'gone'],
  grind: ['ground', 'ground'],
  grow: ['grew', 'grown'],
  hang: ['hung', 'hung'],
  have: ['had', 'had'],
  hear: ['heard', 'heard'],
  hide: ['hid', 'hidden'],
  hit: ['hit', 'hit'],
  hold: ['held', 'held'],
  hurt: ['hurt', 'hurt'],
  keep: ['kept', 'kept'],
  kneel: ['knelt|kneeled', 'knelt|kneeled'],
  know: ['knew', 'known'],
  lay: ['laid', 'laid'],
  lead: ['led', 'led'],
  lean: ['leant|leaned', 'leant|leaned'],
  leap: ['leapt|leaped', 'leapt|leaped'],
  learn: ['learnt|learned', 'learnt|learned'],
  leave: ['left', 'left'],
  lend: ['lent', 'lent'],
  let: ['let', 'let'],
  light: ['lit|lighted', 'lit|lighted'],
  lose: ['lost', 'lost'],
  make: ['made', 'made'],
  mean: ['meant', 'meant'],
  meet: ['met', 'met'],
  mislead: ['misled', 'misled'],
  mistake: ['mistook', 'mistaken'],
  misunderstand: ['misunderstood', 'misunderstood'],
  overcome: ['overcame', 'overcome'],
  oversleep: ['overslept', 'overslept'],
  overtake: ['overtook', 'overtaken'],
  pay: ['paid', 'paid'],
  put: ['put', 'put'],
  quit: ['quit', 'quit'],
  read: ['read', 'read'],
  rewrite: ['rewrote', 'rewritten'],
  ride: ['rode', 'ridden'],
  ring: ['rang', 'rung'],
  rise: ['rose', 'risen'],
  run: ['ran', 'run'],
  say: ['said', 'said'],
  see: ['saw', 'seen'],
  seek: ['sought', 'sought'],
  sell: ['sold', 'sold'],
  send: ['sent', 'sent'],
  set: ['set', 'set'],
  sew: ['sewed', 'sewn|sewed'],
  shake: ['shook', 'shaken'],
  shine: ['shone', 'shone'],
  shoot: ['shot', 'shot'],
  show: ['showed', 'shown|showed'],
  shrink: ['shrank', 'shrunk'],
  shut: ['shut', 'shut'],
  sing: ['sang', 'sung'],
  sink: ['sank', 'sunk'],
  sit: ['sat', 'sat'],
  sleep: ['slept', 'slept'],
  slide: ['slid', 'slid'],
  smell: ['smelt|smelled', 'smelt|smelled'],
  speak: ['spoke', 'spoken'],
  speed: ['sped|speeded', 'sped|speeded'],
  spell: ['spelt|spelled', 'spelt|spelled'],
  spend: ['spent', 'spent'],
  spill: ['spilt|spilled', 'spilt|spilled'],
  spin: ['spun', 'spun'],
  spit: ['spat', 'spat'],
  split: ['split', 'split'],
  spoil: ['spoilt|spoiled', 'spoilt|spoiled'],
  spread: ['spread', 'spread'],
  spring: ['sprang', 'sprung'],
  stand: ['stood', 'stood'],
  steal: ['stole', 'stolen'],
  stick: ['stuck', 'stuck'],
  sting: ['stung', 'stung'],
  stink: ['stank', 'stunk'],
  strike: ['struck', 'struck'],
  swear: ['swore', 'sworn'],
  sweep: ['swept', 'swept'],
  swim: ['swam', 'swum'],
  swing: ['swung', 'swung'],
  take: ['took', 'taken'],
  teach: ['taught', 'taught'],
  tear: ['tore', 'torn'],
  tell: ['told', 'told'],
  think: ['thought', 'thought'],
  throw: ['threw', 'thrown'],
  understand: ['understood', 'understood'],
  undo: ['undid', 'undone'],
  upset: ['upset', 'upset'],
  wake: ['woke', 'woken'],
  wear: ['wore', 'worn'],
  weep: ['wept', 'wept'],
  win: ['won', 'won'],
  wind: ['wound', 'wound'],
  withdraw: ['withdrew', 'withdrawn'],
  write: ['wrote', 'written'],
}

// Irregular noun plurals / adjective degrees, used only to find the word in the example
const EXTRA_FORMS: Record<string, string[]> = {
  child: ['children'],
  man: ['men'],
  woman: ['women'],
  person: ['people'],
  foot: ['feet'],
  tooth: ['teeth'],
  mouse: ['mice'],
  goose: ['geese'],
  good: ['better', 'best'],
  bad: ['worse', 'worst'],
  far: ['further', 'farther', 'furthest', 'farthest'],
  be: ['am', 'is', 'are', 'was', 'were', 'been', 'being'],
}

// ---------------------------------------------------------------------------

const wordsDir = fileURLToPath(new URL('../public/words/', import.meta.url))
const FIELDS = ['id', 'word', 'forms', 'ipa', 'pos', 'level', 'category', 'translation', 'synonyms', 'example', 'exampleUk']

const errors: string[] = []
const warnings: string[] = []
const seenIds = new Map<string, string>()
const seenWordPos = new Map<string, string>()
const table: Record<string, Record<string, number>> = {}

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr)

function expectedId(word: string, pos: string) {
  const slug = word
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug}-${pos}`
}

/** Regular inflections of a single token (plural, 3rd person, past, -ing, comparative). */
function inflect(w: string): string[] {
  const out = new Set([w, `${w}s`, `${w}es`, `${w}d`, `${w}ed`, `${w}ing`, `${w}er`, `${w}r`, `${w}est`, `${w}st`, `${w}ly`])
  if (/[^aeiou]y$/.test(w)) {
    const s = w.slice(0, -1)
    for (const end of ['ies', 'ied', 'ier', 'iest', 'ily']) out.add(s + end)
  }
  if (w.endsWith('e')) out.add(`${w.slice(0, -1)}ing`)
  if (w.endsWith('ie')) out.add(`${w.slice(0, -2)}ying`)
  if (/[^aeiou][aeiou][bdgklmnprt]$/.test(w)) {
    const last = w.at(-1)
    for (const end of ['ed', 'ing', 'er', 'est']) out.add(w + last + end)
  }
  if (w.endsWith('fe')) out.add(`${w.slice(0, -2)}ves`)
  else if (w.endsWith('f')) out.add(`${w.slice(0, -1)}ves`)
  for (const extra of EXTRA_FORMS[w] ?? []) out.add(extra)
  return [...out]
}

/**
 * All surface forms of a (possibly multi-word) entry.
 * The first token is inflected for verbs and phrases ("checks in"), the last one for
 * compound nouns ("cycle lanes", "fitting rooms").
 */
function surfaceForms(word: string, forms: string[] | null): string[] {
  const bases = [word, ...(forms ?? []).flatMap((f) => f.split(/[|/]/))]
  const result = new Set<string>()
  for (const base of bases) {
    const tokens = normalize(base).trim().split(' ')
    const [head, ...rest] = tokens
    for (const h of inflect(head)) result.add([h, ...rest].join(' '))
    if (tokens.length > 1) {
      const last = tokens[tokens.length - 1]
      for (const l of inflect(last)) result.add([...tokens.slice(0, -1), l].join(' '))
    }
  }
  return [...result]
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/'s\b/g, '')
    .replace(/[^a-z'\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function exampleContains(example: string, word: string, forms: string[] | null): boolean {
  const text = ` ${normalize(example).trim()} `
  return surfaceForms(word, forms).some((f) => text.includes(` ${f} `))
}

function checkForms(w: Record<string, unknown>, err: (m: string) => void) {
  const word = w.word as string
  const [head, ...rest] = word.toLowerCase().split(' ')
  const irregular = w.pos === 'verb' || w.pos === 'phrase' ? IRREGULAR_VERBS[head] : undefined
  const tail = rest.length ? ` ${rest.join(' ')}` : ''

  if (w.forms === null) {
    if (irregular && w.pos === 'verb') err(`irregular verb: "forms" required, e.g. ["${word}", "${irregular[0].split('|')[0]}${tail}", "${irregular[1].split('|')[0]}${tail}"]`)
    return
  }
  if (!Array.isArray(w.forms) || w.forms.length !== 3 || !w.forms.every(isStr)) {
    err('"forms" must be null or exactly 3 strings')
    return
  }
  if (w.pos !== 'verb' && w.pos !== 'phrase') err('"forms" only allowed for verbs')
  if (w.forms[0] !== word) err('"forms[0]" must equal "word"')
  if (!irregular) {
    err(`"forms" given, but "${head}" is not in the irregular verbs list (regular verbs must have forms: null)`)
    return
  }
  ;[0, 1].forEach((i) => {
    const allowed = irregular[i].split('|').map((v) => v + tail)
    const actual = (w.forms as string[])[i + 1]
    if (!allowed.includes(actual)) err(`forms[${i + 1}] is "${actual}", expected ${allowed.map((a) => `"${a}"`).join(' or ')}`)
  })
}

// ---------------------------------------------------------------------------

const files = readdirSync(wordsDir).filter((f) => f.endsWith('.json'))
for (const level of LEVELS) {
  if (!files.includes(`${level.toLowerCase()}.json`)) errors.push(`missing file ${level.toLowerCase()}.json`)
}
for (const f of files) {
  if (!LEVELS.some((l) => `${l.toLowerCase()}.json` === f)) errors.push(`${f}: unexpected file (not a CEFR level)`)
}

for (const level of LEVELS) {
  const file = `${level.toLowerCase()}.json`
  if (!files.includes(file)) continue
  let data: unknown
  try {
    data = JSON.parse(readFileSync(wordsDir + file, 'utf-8'))
  } catch (e) {
    errors.push(`${file}: cannot parse (${(e as Error).message})`)
    continue
  }
  if (!Array.isArray(data)) {
    errors.push(`${file}: root must be an array`)
    continue
  }

  data.forEach((raw, i) => {
    const w = raw as Record<string, unknown>
    const where = `${file}[${i}]${isStr(w?.id) ? ` ${w.id}` : ''}`
    const err = (msg: string) => errors.push(`${where}: ${msg}`)
    const warn = (msg: string) => warnings.push(`${where}: ${msg}`)

    if (typeof w !== 'object' || w === null || Array.isArray(w)) return err('must be an object')

    for (const k of FIELDS) if (!(k in w)) err(`missing field "${k}"`)
    for (const k of Object.keys(w)) if (!FIELDS.includes(k)) err(`unknown field "${k}"`)
    for (const k of ['id', 'word', 'ipa', 'example', 'exampleUk']) if (k in w && !isStr(w[k])) err(`"${k}" must be a non-empty string`)

    if (!(POS as readonly string[]).includes(w.pos as string)) err(`invalid pos "${w.pos}"`)
    if (!(LEVELS as readonly string[]).includes(w.level as string)) err(`invalid level "${w.level}"`)
    else if (w.level !== level) err(`level "${w.level}" does not match file ${file}`)
    if (!(CATEGORIES as readonly string[]).includes(w.category as string)) err(`invalid category "${w.category}"`)

    if (isStr(w.word) && w.word !== w.word.trim()) err('"word" has leading/trailing spaces')

    if (isStr(w.id) && isStr(w.word) && isStr(w.pos)) {
      const exp = expectedId(w.word, w.pos)
      if (w.id !== exp) err(`id should be "${exp}"`)
      const prev = seenIds.get(w.id)
      if (prev) err(`duplicate id (already in ${prev})`)
      else seenIds.set(w.id, where)

      const key = `${w.word.toLowerCase()}|${w.pos}`
      const prevWp = seenWordPos.get(key)
      if (prevWp) err(`duplicate word+pos "${w.word}" (${w.pos}), already at ${prevWp}`)
      else seenWordPos.set(key, where)
    }

    if (isStr(w.word) && 'forms' in w) checkForms(w, err)

    if (isStr(w.ipa) && !/^\/[^/]+\/$/.test(w.ipa)) err(`"ipa" must be wrapped in slashes, e.g. /ɡəʊ/ (got ${w.ipa})`)
    if (isStr(w.ipa) && /g/.test(w.ipa)) warn('"ipa" uses Latin "g", use IPA "ɡ"')

    if (!isStrArray(w.translation) || w.translation.length < 1 || w.translation.length > 3) {
      err('"translation" must be 1–3 non-empty strings')
    } else if (new Set(w.translation).size !== w.translation.length) err('"translation" has duplicates')

    if (!isStrArray(w.synonyms) || w.synonyms.length > 3) {
      err('"synonyms" must be an array of 0–3 strings')
    } else if (isStr(w.word) && w.synonyms.some((s) => s.toLowerCase() === (w.word as string).toLowerCase())) {
      err('"synonyms" must not contain the word itself')
    }

    if (isStr(w.example)) {
      const n = w.example.trim().split(/\s+/).length
      if (n < 5 || n > 12) err(`"example" must be 5–12 words (has ${n})`)
      if (!/[.!?]$/.test(w.example.trim())) warn('"example" should end with . ! or ?')
      if (isStr(w.word)) {
        const forms = Array.isArray(w.forms) && w.forms.every(isStr) ? (w.forms as string[]) : null
        if (!exampleContains(w.example, w.word, forms)) err(`"example" does not contain "${w.word}" or its forms: "${w.example}"`)
      }
    }
    // Translations on cards are always Ukrainian, whatever the interface language
    const isUkrainian = (s: string) => /[а-яґєіїʼ']/i.test(s) && /[а-яґєії]/i.test(s)
    if (isStrArray(w.translation)) {
      const notUk = w.translation.filter((t) => !isUkrainian(t))
      if (notUk.length) err(`"translation" must be Ukrainian: ${notUk.map((t) => `"${t}"`).join(', ')}`)
      if (w.translation.some((t) => /[a-zA-Z]/.test(t))) warn('"translation" contains Latin letters')
    }
    if (isStr(w.exampleUk)) {
      if (!isUkrainian(w.exampleUk)) err('"exampleUk" must be Ukrainian')
      else if (/[a-zA-Z]{2,}/.test(w.exampleUk)) warn('"exampleUk" contains Latin letters')
    }

    if (isStr(w.category) && isStr(w.level)) {
      table[w.category] ??= {}
      table[w.category][w.level] = (table[w.category][w.level] ?? 0) + 1
    }
  })
}

// ---------------------------------------------------------------------------
// Report: categories × levels

const pad = (s: string | number, n: number) => String(s).padStart(n)
const header = `${'category'.padEnd(14)}${LEVELS.map((l) => pad(l, 6)).join('')}${pad('total', 7)}`
console.log(header)
console.log('-'.repeat(header.length))
const colTotals: Record<string, number> = {}
for (const c of CATEGORIES) {
  const row = table[c] ?? {}
  let rowTotal = 0
  const cells = LEVELS.map((l) => {
    const n = row[l] ?? 0
    rowTotal += n
    colTotals[l] = (colTotals[l] ?? 0) + n
    return pad(n || '·', 6)
  })
  console.log(`${c.padEnd(14)}${cells.join('')}${pad(rowTotal, 7)}`)
}
console.log('-'.repeat(header.length))
const grand = Object.values(colTotals).reduce((a, b) => a + b, 0)
console.log(`${'total'.padEnd(14)}${LEVELS.map((l) => pad(colTotals[l] ?? 0, 6)).join('')}${pad(grand, 7)}`)
console.log()

for (const w of warnings) console.warn(`warn  ${w}`)
for (const e of errors) console.error(`error ${e}`)

if (errors.length) {
  console.error(`\n✗ ${errors.length} error(s), ${warnings.length} warning(s)`)
  process.exit(1)
}
console.log(`✓ OK${warnings.length ? ` (${warnings.length} warning(s))` : ''}`)
