import React, { useEffect, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { MenuOutlined } from '@ant-design/icons'
import styled from 'styled-components'
import { useUser } from '../../context/useUser'
import logoUrl from '../../assets/logo.png'

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

  img.logo {
    height: 2.5rem;
    width: 2.5rem;
    object-fit: contain;
    border-radius: 0.25rem;
    border: 1px solid rgb(var(--white-rgb) / 0.55);
    box-shadow: 3px 3px 6px 0 rgb(var(--black-rgb) / 0.55);
  }

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
    transition: grid-template-rows calc(var(--anim-duration) / 2) var(--anim-function);
    display: grid;
    grid-template-rows: min-content 0fr;
    align-items: unset;
    border-radius: 0;
    padding: calc(0.75rem + env(safe-area-inset-top)) 0.75rem 0.12rem;
    z-index: 1;
    box-shadow: 0 0.5rem 0.5rem 0 rgb(var(--black-rgb) / 0.4);

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
    padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
    gap: 0;
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
  const { t } = useTranslation()
  useEffect(() => {
    setOpen(false)
  }, [currentLocation.pathname])
  const toggleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setOpen(!open)
  }
  const { user } = useUser()

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
          <HamburgerButton type="button" onClick={toggleOpen} aria-label={t('aria.openMenu')} aria-expanded={open}
                           aria-controls="menu" title={t('aria.openMenu')}>
            <MenuOutlined/>
          </HamburgerButton>
          <img className="logo" alt={t('hero.logo_alt')} src={logoUrl}/>
          <h1>{t('hero.title')}</h1>
        </Link>
        <nav>
          {'anonymous' in user && (<HeaderLink to="/signup">{t('nav.register')}</HeaderLink>)}
          {'anonymous' in user && (<HeaderLink to="/login">{t('nav.login')}</HeaderLink>)}
          {'authenticated' in user && (<HeaderLink to="/profile">{t('nav.profile')}</HeaderLink>)}
          <HeaderLink to="/interpretations/new">{t('nav.interpret')}</HeaderLink>
          <HeaderLink to="/readings/history">{t('nav.history')}</HeaderLink>
          <HeaderLink to="/readings/stats">{t('nav.stats')}</HeaderLink>
        </nav>
      </Header>
      <main style={{ flex: 1, minHeight: 0, display: 'flex', width: '100%' }}>{children}</main>
    </Wrapper>
  )
}
