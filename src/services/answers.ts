import type { ActivityRecord, ProgressRecord, Word } from '@/types'
import { localDateKey } from './date'

export interface AnswerResult {
  record: ProgressRecord
  /** The word became "learned" with this answer (new word known, or review word known) */
  becameLearned: boolean
}

/**
 * Next progress record after an answer (rule 6):
 * "know" → learned, "don't know" → review.
 */
export function applyAnswer(existing: ProgressRecord | undefined, word: Word, known: boolean, now: number): AnswerResult {
  const status = known ? 'learned' : 'review'
  const becameLearned = known && existing?.status !== 'learned'
  const record: ProgressRecord = {
    wordId: word.id,
    status,
    level: word.level,
    category: word.category,
    // snapshot, so lists still work if the word changes in the base;
    // plain copies: IndexedDB cannot store reactive proxies
    word: word.word,
    forms: word.forms ? [word.forms[0], word.forms[1], word.forms[2]] : null,
    translation: [...word.translation],
    firstSeenAt: existing?.firstSeenAt ?? now,
    updatedAt: now,
    timesKnown: (existing?.timesKnown ?? 0) + (known ? 1 : 0),
    timesUnknown: (existing?.timesUnknown ?? 0) + (known ? 0 : 1),
    lastCheckedAt: existing?.lastCheckedAt ?? null,
  }
  return { record, becameLearned }
}

/** Today's activity after one more answer. */
export function addToActivity(existing: ActivityRecord | undefined, date: string, known: boolean, becameLearned: boolean): ActivityRecord {
  return {
    date,
    answered: (existing?.answered ?? 0) + 1,
    known: (existing?.known ?? 0) + (known ? 1 : 0),
    unknown: (existing?.unknown ?? 0) + (known ? 0 : 1),
    newLearned: (existing?.newLearned ?? 0) + (becameLearned ? 1 : 0),
  }
}

/** Save one answer to IndexedDB right away (progress + today's activity) in one transaction. */
export async function recordAnswer(word: Word, known: boolean, now: Date = new Date()): Promise<AnswerResult> {
  const { db } = await import('@/db')
  const date = localDateKey(now)
  return db.transaction('rw', db.progress, db.activity, async () => {
    const result = applyAnswer(await db.progress.get(word.id), word, known, now.getTime())
    await db.progress.put(result.record)
    await db.activity.put(addToActivity(await db.activity.get(date), date, known, result.becameLearned))
    return result
  })
}
