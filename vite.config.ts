import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // We register the service worker ourselves (see main.tsx) so we can
      // show an "update available" prompt instead of silently swapping
      // versions underneath the user.
      injectRegister: null,
      registerType: 'prompt',

      // index.html already links to our own public/manifest.webmanifest
      // (with the iOS-specific meta tags this project relies on), so let
      // the plugin focus purely on generating the offline service worker
      // rather than generating/injecting a second manifest.
      manifest: false,
      includeManifestIcons: false,

      includeAssets: [
        'favicon.svg',
        'icons/icon-180.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-512-maskable.png',
      ],

      workbox: {
        // Precache the built app shell (hashed JS/CSS, HTML, icons) so the
        // whole UI loads with zero network requests once it's been visited.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Google Fonts stylesheet — small, changes rarely.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            // The actual font files — safe to cache for a long time since
            // each URL is unique per font weight/version.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },

      devOptions: {
        // Lets `npm run dev` register a (dev-mode) service worker too, so
        // offline behavior can be sanity-checked without a full build.
        enabled: true,
        type: 'module',
      },
    }),
  ],
})