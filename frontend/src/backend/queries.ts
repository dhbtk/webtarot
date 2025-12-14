import { getSavedReadings } from './savedReadings.ts'
import {
  getInterpretation,
  getUser as apiGetUser,
  logIn as apiLogIn,
  updateUser as apiUpdateUser,
} from './api.ts'
import { mutationOptions, queryOptions } from '@tanstack/react-query'
import { getStoredUser, logOut as doLogOut, setAuthenticatedUser } from './user.ts'
import type { LogInRequest, UpdateUserRequest, User } from './models.ts'

export const useReadingIds = () =>
  queryOptions({
    queryKey: ['readings'],
    queryFn: () => Promise.resolve(getSavedReadings()),
  })

export const useReadingById = (id: string) =>
  queryOptions({
    queryKey: ['readings', id],
    queryFn: async ({ queryKey }) => {
      const result = await getInterpretation(queryKey[1])
      // error handling de milhões!!!
      if (result.error === 'Not found') {
        throw new Error('Reading not found')
      }
      return result
    },
  })

// -------- Auth mutations --------

export const useLogInMutation = () =>
  mutationOptions<User, Error, LogInRequest>({
    mutationKey: ['auth'],
    mutationFn: async (vars: LogInRequest) => {
      const res = await apiLogIn(vars)
      // Persist authenticated user + token in storage for subsequent requests
      setAuthenticatedUser(res.user, res.accessToken)
      // Return the normalized user object for UI consumers
      return res.user
    },
  })

export const useLogOutMutation = () =>
  mutationOptions<void, Error, void>({
    mutationKey: ['auth', 'logout'],
    mutationFn: async () => {
      // Frontend-only: clear token and reset to anonymous user
      doLogOut()
    },
  })

// -------- Current user query & update --------

export const useCurrentUserQuery = () =>
  queryOptions<User>({
    queryKey: ['auth'],
    // Optimistic initial data from local storage to render immediately
    initialData: getStoredUser().user,
    queryFn: async () => {
      return await apiGetUser()
    },
    staleTime: 30_000,
  })

export const useUpdateUserMutation = () =>
  mutationOptions<User, Error, UpdateUserRequest>({
    mutationKey: ['auth'],
    mutationFn: async (vars: UpdateUserRequest) => {
      return await apiUpdateUser(vars)
    },
  })
