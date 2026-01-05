import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import './i18n'
import * as Sentry from '@sentry/react'

// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { asyncStoragePersister, buster, queryClient } from './queryClient.tsx'
import { UserProvider } from './context/UserContext'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
// @ts-expect-error blah
import { registerSW } from 'virtual:pwa-register'
import type { RegisterSWOptions } from 'vite-plugin-pwa/types'

const dsn = import.meta.env?.VITE_SENTRY_DSN as string | undefined
if (dsn) {
  Sentry.init({
    dsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    sendDefaultPii: true,
    enabled: true,
  })
}

const intervalMS = 60 * 60 * 1000

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, r) {
    if (r)
      setInterval(async () => {
        if (r.installing || !navigator) return

        if ('connection' in navigator && !navigator.onLine) return

        const resp = await fetch(swUrl, {
          cache: 'no-store',
          headers: {
            cache: 'no-store',
            'cache-control': 'no-cache',
          },
        })

        if (resp?.status === 200) await r.update()
      }, intervalMS)
  },
} as RegisterSWOptions)

// Create a new router instance
const router = createRouter({ routeTree })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<div>Something went wrong.</div>}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister, buster }}
      >
        <UserProvider>
          <RouterProvider router={router} />
        </UserProvider>
      </PersistQueryClientProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
