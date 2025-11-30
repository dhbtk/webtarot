import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React from 'react'
import { logOut, getStoredUser } from '../backend/user'
import { useUser } from '../context/useUser'

export const Route = createFileRoute('/logout')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { setUser } = useUser()

  React.useEffect(() => {
    try {
      // Clear any authenticated state and switch to a fresh anonymous user
      logOut()
      const { user } = getStoredUser()
      setUser(user)
    } finally {
      // Always redirect back to the readings route
      void navigate({ to: '/readings', replace: true })
    }
  }, [navigate, setUser])

  // No UI needed — this route immediately redirects
  return null
}
