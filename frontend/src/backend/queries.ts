import { getSavedReadings } from './savedReadings.ts'
import { getInterpretation, logIn as apiLogIn } from './api.ts'
import { queryOptions, mutationOptions } from '@tanstack/react-query'
import { logOut as doLogOut, setAuthenticatedUser } from './user.ts'
import type { LogInRequest, User } from './models.ts'

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

// -------- Auth mutations --------

export const useLogInMutation = () => mutationOptions<{ email: string; password: string }, Error, User>({
  mutationKey: ['auth', 'login'],
  mutationFn: async (vars: LogInRequest) => {
    const res = await apiLogIn(vars)
    // Persist authenticated user + token in storage for subsequent requests
    setAuthenticatedUser(res.user, res.accessToken)
    // Return the normalized user object for UI consumers
    return res.user
  },
})

export const useLogOutMutation = () => mutationOptions<void, Error, void>({
  mutationKey: ['auth', 'logout'],
  mutationFn: async () => {
    // Frontend-only: clear token and reset to anonymous user
    doLogOut()
  },
})
