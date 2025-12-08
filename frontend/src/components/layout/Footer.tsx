import styled from 'styled-components'
import { useUser } from '../../context/useUser'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import React from 'react'

const FooterWrapper = styled.footer`
  margin-top: auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  animation: fade-in var(--anim-duration) var(--anim-function) forwards;
  animation-delay: calc(var(--anim-duration) * 2.5);
  opacity: 0;
  text-shadow: 1px 1px 2px rgb(var(--black-rgb) / 0.8);
  color: rgb(var(--white-rgb) / 0.75);

  &.layout-only a {
    color: rgb(var(--white-rgb) / 0.85);
    font-weight: 500;
    text-decoration: underline;
  }

  &:not(.layout-only) {
    background-color: rgb(var(--black-rgb) / 0.25);
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0.5rem 0.5rem 0.75rem 0 rgba(0, 0, 0, 0.25);
    color: rgb(var(--white-rgb) / 0.7);
  }

  &.layout-only {
    padding: 0.75rem;
    background: rgb(var(--black-rgb) / 0.1);
    margin-left: -1rem;
    width: calc(100% + 2rem);
    margin-bottom: -1rem;
    border-radius: 0.5rem;
    border: 1px solid rgb(var(--black-rgb) / 0.1);
    animation-delay: calc(var(--anim-duration) * 1.5);
  }

  font-size: var(--fs-xs);

  @media (max-width: 768px) {
    font-size: var(--fs-xxs);
  }
`

const LocaleSelect = styled.select`
  font-family: var(--font-sans-alt);
  font-size: var(--fs-xs);
  background: rgb(var(--black-rgb) / 0.2);
  border: 1px solid rgb(var(--accent-rgb) / 0.4);
  border-radius: 6px;
  box-shadow: 0 0 2px 2px transparent;
  transition: box-shadow 0.25s ease-in-out;
  color: rgb(var(--white-rgb) / 0.75);
  padding: 0.12rem 0.25rem 0 0.5rem;

  &:hover {
    box-shadow: 0 0 2px 2px rgb(var(--accent-rgb) / 0.5);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 2px 2px rgb(var(--accent-rgb));
  }

  @media (max-width: 768px) {
    font-size: var(--fs-xxs);
  }
`

export const Footer: React.FC<{ minimal?: boolean }> = ({ minimal }) => {
  const { i18n, t } = useTranslation()
  const { user } = useUser()

  const onChangeLocale = (e: React.ChangeEvent<HTMLSelectElement>) => {
    void i18n.changeLanguage(e.target.value)
  }

  return (
    <FooterWrapper className={minimal ? 'layout-only' : ''}>
      <span>
        {'authenticated' in user ? (
          <>
            <Link to="/logout">Log out</Link>
          </>
        ) : (
          <code>{user.anonymous.id}</code>
        )}
        <br/>
      <span>{t('layout.footer.madeBy')} <a href="https://github.com/dhbtk" target="_blank">@dhbtk</a>
      </span>
      </span>
      <LocaleSelect
        aria-label={t('layout.footer.languageAriaLabel')}
        title={t('layout.footer.languageTitle')}
        value={i18n.language?.split('-')[0] ?? 'en'}
        onChange={onChangeLocale}
      >
        <option value="en">English</option>
        <option value="pt">Português</option>
      </LocaleSelect>
    </FooterWrapper>
  )
}
