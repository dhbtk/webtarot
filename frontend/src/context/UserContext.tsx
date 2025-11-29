import React, { createContext, useContext, useMemo, useState } from 'react'
import { getUserId as loadUserId } from '../backend/user'
import { setAnonymousUserId as persistAnonymousUserId } from '../backend/user'

type UserContextValue = {
  userId: string
  setUserId: (id: string) => void
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

export function UserProvider ({ children }: { children: React.ReactNode }) {
  // Lazy initialize from localStorage (or generate if absent)
  const [userIdState, setUserIdState] = useState<string>(() => loadUserId())

  const value = useMemo<UserContextValue>(() => ({
    userId: userIdState,
    setUserId: (id: string) => {
      setUserIdState(id)
      try {
        // Persist as anonymous user if a component explicitly sets an id
        persistAnonymousUserId(id)
      } catch {
        // ignore persistence errors (e.g., private mode)
      }
    }
  }), [userIdState])

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUserId () {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUserId must be used within a UserProvider')
  return ctx
}
