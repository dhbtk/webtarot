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
