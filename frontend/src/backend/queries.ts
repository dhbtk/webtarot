import { getSavedReadings } from './savedReadings.ts'
import type { GetInterpretationResult } from './models.ts'
import { getInterpretation } from './api.ts'
import { queryOptions } from '@tanstack/react-query'

export const useReadingIds = () => queryOptions({
  queryKey: ['readings'],
  queryFn: () => Promise.resolve(getSavedReadings()),
})

export const useReadingById = (id: string) => queryOptions({
    queryKey: ['readings', id],
    queryFn: ({ queryKey }) => getInterpretation(queryKey[1]) as Promise<GetInterpretationResult>,
  }
)
