import React, { useEffect, useMemo, useState } from 'react'
import type { User } from '../backend/models'
import { getStoredUser, setStoredUser } from '../backend/user'
import { UserContext, type UserContextValue } from './UserContextBase'
import { getUser as apiGetUser } from '../backend/api'

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Lazy initialize from localStorage (or generate if absent)
  const [userState, setUserState] = useState<User>(() => getStoredUser().user)

  const value = useMemo<UserContextValue>(
    () => ({
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
      },
    }),
    [userState],
  )

  // On mount, refresh the current user from the backend to ensure we have the latest data
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const fresh = await apiGetUser()
        if (!cancelled) {
          // Use the context setter so storage is updated preserving token
          value.setUser(fresh)
        }
      } catch {
        // Ignore errors (e.g., offline/401); keep stored user
      }
    })()
    return () => {
      cancelled = true
    }
    // We only want this to run on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
