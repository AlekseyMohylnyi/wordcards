import { ref } from 'vue'

/**
 * "Install app" support for browsers that fire `beforeinstallprompt` (Chrome / Edge / Samsung Internet on Android).
 * iPhone Safari never fires it, so there the UI simply stays hidden and the user installs via Share → Add to Home Screen.
 */

/** Chromium-only event, not in the TS DOM lib */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallResult = 'accepted' | 'dismissed' | 'unavailable'

export const INSTALL_DISMISS_KEY = 'wordcards-install-dismissed'
/** "Later" hides the Home banner for this many days (the Settings button stays) */
export const INSTALL_SNOOZE_DAYS = 14

/** True when the browser has offered installation and the app is not installed yet */
export const canInstall = ref(false)

let deferred: BeforeInstallPromptEvent | null = null
let initialized = false

/** Call once at startup, before the browser fires `beforeinstallprompt` */
export function initInstallPrompt(target: Window = window): void {
  if (initialized) return
  initialized = true
  target.addEventListener('beforeinstallprompt', (e) => {
    // Keep the event so our own button can show the native dialog later
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    canInstall.value = true
  })
  target.addEventListener('appinstalled', () => {
    deferred = null
    canInstall.value = false
  })
}

/** Show the browser's install dialog. Must be called from a user gesture (click). */
export async function promptInstall(): Promise<InstallResult> {
  const e = deferred
  if (!e) return 'unavailable'
  // The event can be used only once
  deferred = null
  canInstall.value = false
  await e.prompt()
  const { outcome } = await e.userChoice
  return outcome
}

/** Whether the Home banner should show, given the stored "Later" timestamp (ms) */
export function isInstallBannerSnoozed(dismissedAt: number | null, now: number = Date.now()): boolean {
  if (dismissedAt == null || !Number.isFinite(dismissedAt)) return false
  return now - dismissedAt < INSTALL_SNOOZE_DAYS * 24 * 60 * 60 * 1000
}

export function readInstallDismissedAt(): number | null {
  try {
    const raw = localStorage.getItem(INSTALL_DISMISS_KEY)
    return raw ? Number(raw) : null
  } catch {
    return null
  }
}

export function snoozeInstallBanner(now: number = Date.now()): void {
  try {
    localStorage.setItem(INSTALL_DISMISS_KEY, String(now))
  } catch {
    // storage blocked: the banner just shows again next time
  }
}

/** Test helper: forget the captured event */
export function resetInstallPromptForTests(): void {
  deferred = null
  initialized = false
  canInstall.value = false
}
