// Text-to-speech with the Web Speech API (offline, no keys).
// iOS loads voices asynchronously, so we keep a voice list updated via `voiceschanged`
// and speak synchronously inside the tap handler (required by iOS).

export type SpeechLang = 'en-US' | 'en-GB'

interface VoiceLike {
  lang: string
  name: string
  localService: boolean
  default: boolean
}

let voices: SpeechSynthesisVoice[] = []

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

function refreshVoices() {
  voices = window.speechSynthesis.getVoices()
}

if (isSpeechSupported()) {
  refreshVoices()
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices)
}

/** Best voice for a language: exact locale (local first), then any English voice. */
export function pickVoice<T extends VoiceLike>(list: readonly T[], lang: SpeechLang): T | undefined {
  const norm = (l: string) => l.replace('_', '-').toLowerCase()
  const want = lang.toLowerCase()
  const exact = list.filter((v) => norm(v.lang) === want)
  const score = (v: T) => (v.localService ? 2 : 0) + (v.default ? 1 : 0)
  if (exact.length) return exact.slice().sort((a, b) => score(b) - score(a))[0]
  return list.find((v) => norm(v.lang).startsWith('en'))
}

/** Speak text. Call directly from a click/tap handler. */
export function speak(text: string, lang: SpeechLang = 'en-US', rate = 1): boolean {
  if (!isSpeechSupported()) return false
  const synth = window.speechSynthesis
  if (!voices.length) refreshVoices()
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = rate
  const voice = pickVoice(voices, lang)
  if (voice) u.voice = voice
  synth.speak(u)
  return true
}

/** Text to pronounce for a card: irregular verbs say all three forms. */
export function speechText(word: string, forms: readonly string[] | null): string {
  return forms ? forms.join(', ') : word
}
