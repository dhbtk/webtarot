import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import './i18n'

// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient.tsx'
import { UserProvider } from './context/UserContext'

// Create a new router instance
const router = createRouter({ routeTree })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <RouterProvider router={router}/>
      </UserProvider>
    </QueryClientProvider>
  </StrictMode>,
)

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
