import { createFileRoute, useNavigate } from '@tanstack/react-router'
import styled from 'styled-components'
import React from 'react'
import { Form, FormWrapper, InputWrapper, Label, SubmitButton } from '../components/reading/form/form.tsx'
import { Footer } from '../components/layout/Footer.tsx'
import { useMutation } from '@tanstack/react-query'
import { useLogInMutation } from '../backend/queries.ts'
import { useUser } from '../context/UserContext.tsx'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/login')({
  component: RouteComponent,
})

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
`

const Input = styled.input`
  font-family: var(--font-sans-alt);
  font-size: var(--fs-sm);
  background: rgb(var(--black-rgb) / 0.2);
  border: 1px solid rgb(var(--accent-rgb) / 0.5);
  border-radius: 6px;
  padding: 0.5rem;
  box-shadow: 0 0 2px 2px transparent;
  transition: box-shadow 0.25s ease-in-out;
  color: rgb(var(--white-rgb) / 0.75);

  &:hover {
    box-shadow: 0 0 2px 2px rgb(var(--accent-rgb) / 0.5);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 2px 2px rgb(var(--accent-rgb));
  }
`

function RouteComponent () {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const navigate = useNavigate()
  const { setUser } = useUser()
  const loginMutation = useMutation(useLogInMutation())
  const { t } = useTranslation()

  async function onSubmit (e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || loginMutation.isPending) return
    loginMutation.mutate(
      { email, password },
      {
        onSuccess: async (user) => {
          // Reflect the authenticated user in context
          setUser(user)
          // Navigate to a sensible post-login page
          await navigate({ to: '/readings' })
        },
      }
    )
  }

  return (
    <Wrapper>
      <FormWrapper>
        <h2>{t('auth.login.title')}</h2>
        <Form onSubmit={onSubmit}>
          <Label>
            <span>{t('auth.login.emailLabel')}</span>
            <InputWrapper>
              <Input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t('auth.login.emailPlaceholder')}
              />
            </InputWrapper>
          </Label>
          <Label>
            <span>{t('auth.login.passwordLabel')}</span>
            <InputWrapper>
              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={t('auth.login.passwordPlaceholder')}
              />
            </InputWrapper>
          </Label>
          {loginMutation.error && (
            <div role="alert" aria-live="assertive" style={{ color: 'salmon', fontSize: 'var(--fs-xs)' }}>
              {(loginMutation.error as Error).message || t('auth.login.error')}
            </div>
          )}
          <SubmitButton type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? t('auth.login.submitting') : t('auth.login.submit')}
          </SubmitButton>
        </Form>
      </FormWrapper>
      <Footer/>
    </Wrapper>
  )
}
