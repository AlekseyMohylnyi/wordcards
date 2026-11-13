import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  INSTALL_SNOOZE_DAYS,
  canInstall,
  initInstallPrompt,
  isInstallBannerSnoozed,
  promptInstall,
  resetInstallPromptForTests,
} from './install'

const DAY = 24 * 60 * 60 * 1000

function fakePromptEvent(outcome: 'accepted' | 'dismissed') {
  const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  }
  e.prompt = vi.fn(() => Promise.resolve())
  e.userChoice = Promise.resolve({ outcome })
  return e
}

describe('install prompt', () => {
  let target: EventTarget

  beforeEach(() => {
    resetInstallPromptForTests()
    target = new EventTarget()
    initInstallPrompt(target as unknown as Window)
  })

  it('is unavailable until the browser offers installation', async () => {
    expect(canInstall.value).toBe(false)
    expect(await promptInstall()).toBe('unavailable')
  })

  it('captures the event, suppresses the default UI and shows the dialog on demand', async () => {
    const e = fakePromptEvent('accepted')
    target.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
    expect(canInstall.value).toBe(true)

    expect(await promptInstall()).toBe('accepted')
    expect(e.prompt).toHaveBeenCalledOnce()
    expect(canInstall.value).toBe(false)
  })

  it('uses the event only once', async () => {
    target.dispatchEvent(fakePromptEvent('dismissed'))
    expect(await promptInstall()).toBe('dismissed')
    expect(await promptInstall()).toBe('unavailable')
  })

  it('hides the button after the app is installed', () => {
    target.dispatchEvent(fakePromptEvent('accepted'))
    target.dispatchEvent(new Event('appinstalled'))
    expect(canInstall.value).toBe(false)
  })
})

describe('isInstallBannerSnoozed', () => {
  const now = 1_700_000_000_000

  it('is not snoozed when never dismissed or the value is broken', () => {
    expect(isInstallBannerSnoozed(null, now)).toBe(false)
    expect(isInstallBannerSnoozed(Number.NaN, now)).toBe(false)
  })

  it(`stays snoozed for ${INSTALL_SNOOZE_DAYS} days after "Later"`, () => {
    expect(isInstallBannerSnoozed(now - DAY, now)).toBe(true)
    expect(isInstallBannerSnoozed(now - (INSTALL_SNOOZE_DAYS * DAY - 1), now)).toBe(true)
    expect(isInstallBannerSnoozed(now - INSTALL_SNOOZE_DAYS * DAY, now)).toBe(false)
  })
})
