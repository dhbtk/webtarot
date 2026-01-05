import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tanstackRouter from '@tanstack/router-plugin/vite'
import path from 'node:path'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load root .env so frontend can read SENTRY_DSN via define
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '')

  return {
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
      }),
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,jpg,jpeg}'],
        },
        devOptions: {
          enabled: true,
        },
        manifest: {
          name: 'webtarot.io',
          short_name: 'webtarot',
          theme_color: '#3d3476',
          description: 'leituras de tarot',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    define: {
      'import.meta.env.VITE_SENTRY_DSN': JSON.stringify(rootEnv.SENTRY_DSN ?? ''),
    },
    server: {
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/interpretation/notify': {
          target: 'ws://localhost:3000',
          ws: true,
          rewriteWsOrigin: true,
        },
      },
    },
    build: {
      sourcemap: true,
    },
  }
})
