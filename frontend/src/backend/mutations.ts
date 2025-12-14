import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createUser } from './api'
import type { CreateUserRequest, CreateUserResponse, User } from './models'
import { setAuthenticatedUser } from './user'

export function useSignUpMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['auth', 'signup'],
    mutationFn: async (payload: CreateUserRequest): Promise<CreateUserResponse> => {
      return await createUser(payload)
    },
    onSuccess: async (data: CreateUserResponse) => {
      // Persist authenticated user and token
      setAuthenticatedUser(data.user as User, data.accessToken)
      // Invalidate queries that depend on auth state
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['history'] }),
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
      ])
    },
  })
}
