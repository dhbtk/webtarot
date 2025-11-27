import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AppShell } from '../components/layout/AppShell.tsx'

export default function RootRoute () {
  return (
    <AppShell>
      <Outlet/>
    </AppShell>
  )
}

export const Route = createRootRoute({
  component: RootRoute
})
