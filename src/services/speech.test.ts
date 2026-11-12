import { describe, expect, it } from 'vitest'
import { pickVoice, speechText } from './speech'

const v = (lang: string, name: string, localService = true, isDefault = false) => ({ lang, name, localService, default: isDefault })

describe('pickVoice', () => {
  const voices = [v('uk-UA', 'Lesya'), v('en-GB', 'Daniel'), v('en-US', 'Remote', false), v('en-US', 'Samantha'), v('en_AU', 'Karen')]

  it('picks an exact locale, preferring local voices', () => {
    expect(pickVoice(voices, 'en-US')?.name).toBe('Samantha')
    expect(pickVoice(voices, 'en-GB')?.name).toBe('Daniel')
  })

  it('falls back to any English voice', () => {
    expect(pickVoice([v('uk-UA', 'Lesya'), v('en_AU', 'Karen')], 'en-GB')?.name).toBe('Karen')
  })

  it('returns undefined when there is no English voice', () => {
    expect(pickVoice([v('uk-UA', 'Lesya')], 'en-US')).toBeUndefined()
  })
})

describe('speechText', () => {
  it('reads irregular verb forms', () => {
    expect(speechText('go', ['go', 'went', 'gone'])).toBe('go, went, gone')
    expect(speechText('house', null)).toBe('house')
  })
})
