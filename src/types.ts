export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type Level = (typeof LEVELS)[number]

export const CATEGORIES = [
  'home',
  'nature',
  'travel',
  'food',
  'work',
  'health',
  'city',
  'feelings',
  'tech',
  'shopping',
  'sport',
  'family',
  'clothes',
  'communication',
] as const
export type Category = (typeof CATEGORIES)[number]

export const POS = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'determiner',
  'interjection',
  'phrase',
] as const
export type PartOfSpeech = (typeof POS)[number]

/** One entry of public/words/<level>.json */
export interface Word {
  id: string
  word: string
  forms: [string, string, string] | null
  ipa: string
  pos: PartOfSpeech
  level: Level
  category: Category
  translation: string[]
  synonyms: string[]
  example: string
  exampleUk: string
}

export type WordStatus = 'learned' | 'review'

export interface ProgressRecord {
  wordId: string
  status: WordStatus
  level: Level
  category: Category
  word: string
  forms: [string, string, string] | null
  translation: string[]
  firstSeenAt: number
  updatedAt: number
  timesKnown: number
  timesUnknown: number
  lastCheckedAt: number | null
}

export interface ActivityRecord {
  /** Local date, YYYY-MM-DD */
  date: string
  answered: number
  known: number
  unknown: number
  newLearned: number
}

export interface SettingRecord {
  key: string
  value: unknown
}

export interface BadgeRecord {
  id: string
  earnedAt: number
}
