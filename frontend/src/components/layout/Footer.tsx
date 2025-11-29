import styled from 'styled-components'
import { useUser } from '../../context/UserContext'
import { useTranslation } from 'react-i18next'

const FooterWrapper = styled.footer`
  margin-top: auto;
  background-color: rgb(var(--black-rgb) / 0.25);
  padding: 1.5rem;
  border-radius: 0.75rem;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  box-shadow: 0.5rem 0.5rem 0.75rem 0 rgba(0, 0, 0, 0.25);
  animation: fade-in var(--anim-duration) var(--anim-function) forwards;
  animation-delay: calc(var(--anim-duration) * 2);
  opacity: 0;
  color: rgb(var(--white-rgb) / 0.5);
  text-shadow: 1px 1px 2px rgb(var(--black-rgb) / 0.8);

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

export const Footer = () => {
  const { i18n, t } = useTranslation()
  const { user } = useUser()
  const userId = 'anonymous' in user ? user.anonymous.id : user.authenticated.id

  const onChangeLocale = (e: React.ChangeEvent<HTMLSelectElement>) => {
    void i18n.changeLanguage(e.target.value)
  }

  return (
    <FooterWrapper>
      <span>{t('layout.footer.madeBy')} <a href="https://github.com/dhbtk" target="_blank">@dhbtk</a><br/>
      <code>{userId}</code>
      </span>
      <LocaleSelect
        aria-label={t('layout.footer.languageAriaLabel')}
        title={t('layout.footer.languageTitle')}
        value={i18n.language?.split('-')[0] ?? 'en'}
        onChange={onChangeLocale}
        style={{ marginLeft: 'auto' }}
      >
        <option value="en">English</option>
        <option value="pt">Português</option>
      </LocaleSelect>
    </FooterWrapper>
  )
}
