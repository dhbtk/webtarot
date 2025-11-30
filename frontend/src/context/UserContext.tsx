import React, { useMemo, useState } from 'react'
import type { User } from '../backend/models'
import { getStoredUser, setStoredUser } from '../backend/user'
import { UserContext, type UserContextValue } from './UserContextBase'

export function UserProvider ({ children }: { children: React.ReactNode }) {
  // Lazy initialize from localStorage (or generate if absent)
  const [userState, setUserState] = useState<User>(() => getStoredUser().user)

  const value = useMemo<UserContextValue>(() => ({
    user: userState,
    setUser: (user: User) => {
      setUserState(user)
      try {
        // Persist the user while preserving any existing access token
        const stored = getStoredUser()
        setStoredUser({ user, accessToken: stored.accessToken })
      } catch {
        // ignore persistence errors (e.g., private mode)
      }
    }
  }), [userState])

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}
