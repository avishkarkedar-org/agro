import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      manifest: {
        name: 'AgroIntel — Smart Farming Intelligence',
        short_name: 'AgroIntel',
        description: 'AI-powered smart farming assistant for Indian farmers. Scan plant diseases, get weather forecasts, check mandi prices, plan crops, and connect with the farming community.',
        // R150: was #16a34a (bright green) - this painted the Android status
        // bar / task-switcher card and the standalone-launch splash background
        // a saturated green regardless of theme, which is the "green element"
        // reported above the header/hamburger on load. Matched to ds-tokens
        // .css's dark --ds-bg so installed-app chrome matches the app itself.
        theme_color: '#0a0d0c',
        background_color: '#0a0d0c',
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌾</text></svg>",
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌾</text></svg>",
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            // R151: this maskable icon's rect fill was still the old bright
            // green (#16a34a) even after R150 fixed theme_color/background_color
            // above. Maskable icons require an opaque background (the OS crops
            // the safe zone to a circle/rounded-square), so this solid green
            // square is what some browsers pick as the actual tab/address-bar
            // favicon when no explicit <link rel="icon"> exists - that green
            // square, not any on-page element, was the persistent green patch
            // users kept seeing above the header. Recolored to match the dark
            // theme; index.html now also ships an explicit transparent favicon
            // so browsers stop guessing from this icon list.
            src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%230a0d0c'/><text x='50' y='50' font-size='52' text-anchor='middle' dominant-baseline='central'>🌾</text></svg>",
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // SETTINGS_SW_R89: /api/settings is deliberately NOT cached here.
            // It was previously matched by a NetworkFirst rule with a 4 second
            // network timeout, so a cold Render backend caused the service worker
            // to serve settings that were up to an hour old -- admin feature
            // toggles looked like they never applied. SettingsContext now keeps
            // its own last-known-good copy in localStorage, which is smarter than
            // an opaque SW cache because it can be normalized and inspected.
            urlPattern: /\/api\/(news|updates)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'agrointel-live-cache-r89',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/.*\/api\/(mandi|weather|fertilizers|rentals|kvk|youtube|fuel)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'agrointel-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  }
})
