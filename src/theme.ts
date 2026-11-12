// Colour themes (accent). The palette lives in styles/theme.css under :root[data-accent=…].
export const ACCENTS = ['violet', 'green', 'blue', 'cyan', 'red', 'yellow'] as const
export type Accent = (typeof ACCENTS)[number]

/** Swatch shown in Settings (the theme's button colour). */
export const ACCENT_SWATCH: Record<Accent, string> = {
  violet: '#6c4cf1',
  green: '#047857',
  blue: '#2563eb',
  cyan: '#0e7490',
  red: '#e11d48',
  yellow: '#b45309',
}

export const ACCENT_STORAGE_KEY = 'wordcards-accent'

export function isAccent(v: unknown): v is Accent {
  return typeof v === 'string' && (ACCENTS as readonly string[]).includes(v)
}

/** Apply a theme to the page and remember it for the next start (read by index.html before paint). */
export function applyAccent(accent: Accent): void {
  const root = document.documentElement
  if (accent === 'violet') delete root.dataset.accent
  else root.dataset.accent = accent
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, accent)
  } catch {
    // storage unavailable: the theme still applies for this session
  }
  syncThemeColor()
}

/** Browser/status-bar colour = the app background of the current theme and mode. */
export function syncThemeColor(): void {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim()
  if (!bg) return
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const media = m.getAttribute('media')
    // keep the light/dark split: each tag gets the colour for its own scheme
    if (!media || window.matchMedia(media).matches) m.content = bg
  })
}

/** Re-sync when the system switches between light and dark. */
export function watchColorScheme(): void {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', syncThemeColor)
}
