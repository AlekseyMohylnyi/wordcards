// Generates PWA icons from public/icon.svg:  npm run icons
// Output (next to the source, in public/): favicon.ico, pwa-64x64.png, pwa-192x192.png,
// pwa-512x512.png, maskable-icon-512x512.png, apple-touch-icon-180x180.png
//
// icon.svg already has a full-bleed background and keeps the artwork inside the
// maskable safe zone (a circle of 40% radius), so no extra padding is added:
// padding would show as a flat-coloured frame around the gradient.
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0 },
    apple: { ...minimal2023Preset.apple, padding: 0 },
  },
  images: ['public/icon.svg'],
})
