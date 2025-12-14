import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tanstackRouter from '@tanstack/router-plugin/vite'
import path from 'node:path'

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
  }
})
