import { createRootRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { MenuOutlined } from '@ant-design/icons'

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

  button {
    display: none;
  }

  nav {
    display: flex;
    gap: 1rem;
  }

  @media (max-width: 768px) {
    transition: grid-template-rows var(--anim-duration) var(--anim-function);
    display: grid;
    grid-template-rows: min-content 0fr;
    align-items: unset;

    nav {
      flex-direction: column;
      gap: 0.5rem;
      overflow: hidden;
    }

    &.open {
      grid-template-rows: min-content 1fr;
    }

    button {
      display: initial;
    }
  }
`

const HamburgerButton = styled.button`
  background: none;
  border: none;
  outline: none;
  color: inherit;
  font-size: var(--fs-xxl);
  cursor: pointer;
`

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  min-height: 100vh;
  width: 100%;
  max-width: min(100vw, 1200px);
  margin: 0 auto;
  padding-top: 1rem;
  padding-bottom: 1rem;
  gap: 1rem;
  @media (max-width: 768px) {
    padding: calc(0.5rem + env(safe-area-inset-top)) 0.5rem calc(0.5rem + env(safe-area-inset-bottom));
  }
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
  const [open, setOpen] = useState(false)
  const currentLocation = useLocation()
  useEffect(() => {
    setOpen(false)
  }, [currentLocation.pathname])
  const toggleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setOpen(!open)
  }

  return (
    <Wrapper>
      <Header className={open ? 'open' : ''}>
        <Link to="/readings"
              style={{
                color: 'inherit',
                textDecoration: 'none',
                marginRight: 'auto',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center'
              }}>
          <HamburgerButton type="button" onClick={toggleOpen} aria-label="Abrir Menu" aria-expanded={open}
                           aria-controls="menu" title="Abrir Menu">
            <MenuOutlined/>
          </HamburgerButton>
          <h1>webtarot</h1>
        </Link>
        <nav>
          <HeaderLink to="/interpretations/new">Interpretar</HeaderLink>
          <HeaderLink to="/readings/history">Histórico</HeaderLink>
          <HeaderLink to="/readings/stats">Stats</HeaderLink>
        </nav>
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
