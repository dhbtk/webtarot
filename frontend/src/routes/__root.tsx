import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import React from 'react'
import styled from 'styled-components'

const Header = styled.header`
  background-color: rgba(82, 69, 150, 0.7);
  padding: 1.5rem;
  border-radius: 0.75rem;
  width: 100%;

  h1 {
    margin: 0;
    padding: 0;
    font-size: 2rem;
    font-weight: 500;
  }
`

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  min-height: 100vh;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding-top: 1rem;
  padding-bottom: 1rem;
  gap: 1rem;
`

export const AppShell: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <Wrapper>
      <Header>
        <Link to="/readings" style={{ color: 'inherit', textDecoration: 'none' }}>
          <h1>webtarot</h1>
        </Link>
      </Header>
      <main style={{ flex: 1, minHeight: 0, display: 'flex', width: '100%' }}>{children}</main>
    </Wrapper>
  )
}

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
