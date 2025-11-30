import { createContext } from 'react'
import type { User } from '../backend/models'

export type UserContextValue = {
  user: User
  setUser: (user: User) => void
}

export const UserContext = createContext<UserContextValue | undefined>(undefined)
