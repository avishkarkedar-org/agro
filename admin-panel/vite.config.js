import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      manifest: {
        name: 'AgroIntel Admin Panel',
        short_name: 'AgroIntel Admin',
        description: 'AgroIntel Admin Dashboard for Smart Farming Intelligence',
        // R151: was #16a34a (bright green) - the same class of bug fixed in
        // the main site's vite.config.js under R150. A bright green
        // theme_color paired with a dark background_color mismatched the
        // installed-app status bar / task-switcher card against the admin
        // panel's actual dark UI. Matched to background_color so
        // installed-app chrome is consistent with the app itself.
        theme_color: '#060c06',
        background_color: '#060c06',
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌾</text></svg>",
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ]
})
