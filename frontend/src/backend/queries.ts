import { getSavedReadings } from './savedReadings.ts'
import { getInterpretation } from './api.ts'
import { queryOptions } from '@tanstack/react-query'

export const useReadingIds = () => queryOptions({
  queryKey: ['readings'],
  queryFn: () => Promise.resolve(getSavedReadings()),
})

export const useReadingById = (id: string) => queryOptions({
    queryKey: ['readings', id],
    queryFn: async ({ queryKey }) => {
      const result = await getInterpretation(queryKey[1])
      // error handling de milhões!!!
      if (result.error === "Not found") {
        throw new Error("Reading not found")
      }
      return result
    },
  }
)
