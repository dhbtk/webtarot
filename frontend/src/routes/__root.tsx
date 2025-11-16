import { Outlet, Link, createRootRoute } from '@tanstack/react-router'
import React from 'react'

export const AppShell: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
        <Link to="/readings" style={{ color: 'inherit', textDecoration: 'none' }}>
          <h1 style={{ margin: 0, fontSize: '1.125rem' }}>WebTarot</h1>
        </Link>
      </header>
      <main style={{ flex: 1, minHeight: 0 }}>{children}</main>
    </div>
  )
}

export default function RootRoute() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export const Route = createRootRoute({
  component: RootRoute
})
