import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import React from 'react'
import styled from 'styled-components'

const Header = styled.header`
  background-color: rgb(82 69 150 / 0.7);
  padding: 1.5rem;
  border-radius: 0.75rem;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0.5rem 0.5rem 0.75rem 0 rgba(0, 0, 0, 0.25);
  animation: slide-from-top var(--anim-duration) var(--anim-function) forwards;

  h1 {
    margin: 0;
    padding: 0;
    font-size: var(--fs-xxl);
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

const HeaderLink = styled(Link)`
  font-weight: 500;
  font-size: var(--fs-base);
  padding: 0.12rem 0.5rem;
  border: 1px solid transparent;
  color: rgb(var(--white-rgb) / 0.75);
  border-radius: 6px;

  &:hover {
    color: rgb(var(--white-rgb) / 0.75);
    text-decoration: underline;
  }

  &.active {
    background: rgb(var(--white-rgb) / 0.1);
  }
`

export const AppShell: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <Wrapper>
      <Header>
        <Link to="/readings" style={{ color: 'inherit', textDecoration: 'none', marginRight: 'auto' }}>
          <h1>webtarot</h1>
        </Link>
        <HeaderLink to="/readings/history">Histórico</HeaderLink>
        <HeaderLink to="/readings/stats">Stats</HeaderLink>
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
