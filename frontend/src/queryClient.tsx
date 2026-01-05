import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'

export const buster = 'v1'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 3, // 3 days
    },
  },
})

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: window.localStorage,
})
