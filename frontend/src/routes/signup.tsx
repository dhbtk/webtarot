import { createFileRoute, useNavigate } from '@tanstack/react-router'
import styled from 'styled-components'
import React from 'react'
import { Form, FormWrapper, InputWrapper, Label, SubmitButton, Textarea } from '../components/reading/form/form.tsx'
import { Footer } from '../components/layout/Footer.tsx'
import { useSignUpMutation } from '../backend/mutations.ts'
import { useUser } from '../context/UserContext.tsx'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/signup')({
  component: RouteComponent,
})

function RouteComponent () {
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [selfDescription, setSelfDescription] = React.useState('')
  const navigate = useNavigate()
  const { setUser } = useUser()
  const signUpMutation = useSignUpMutation()
  const { t } = useTranslation()

  async function onSubmit (e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || !name || signUpMutation.isPending) return
    signUpMutation.mutate(
      { email, password, name, selfDescription },
      {
        onSuccess: async (data) => {
          // Reflect the authenticated user in context
          setUser(data.user)
          // Navigate to a sensible post-signup page
          await navigate({ to: '/readings' })
        },
      }
    )
  }

  return (
    <Wrapper>
      <FormWrapper>
        <h2>{t('auth.signup.title')}</h2>
        <Form onSubmit={onSubmit}>
          <Label>
            <span>{t('auth.signup.nameLabel')}</span>
            <InputWrapper>
              <Input
                type="text"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t('auth.signup.namePlaceholder')}
              />
            </InputWrapper>
          </Label>
          <Label>
            <span>{t('auth.signup.emailLabel')}</span>
            <InputWrapper>
              <Input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t('auth.signup.emailPlaceholder')}
              />
            </InputWrapper>
          </Label>
          <Label>
            <span>{t('auth.signup.passwordLabel')}</span>
            <InputWrapper>
              <Input
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={t('auth.signup.passwordPlaceholder')}
              />
            </InputWrapper>
          </Label>
          <Label>
            <span>{t('auth.signup.selfDescriptionLabel')}</span>
            <InputWrapper>
              <Textarea
                name="selfDescription"
                value={selfDescription}
                onChange={(e) => setSelfDescription(e.target.value)}
                rows={4}
                placeholder={t('auth.signup.selfDescriptionPlaceholder')}
              />
            </InputWrapper>
          </Label>
          {signUpMutation.error && (
            <div role="alert" aria-live="assertive" style={{ color: 'salmon', fontSize: 'var(--fs-xs)' }}>
              {(signUpMutation.error as Error).message || t('auth.signup.error')}
            </div>
          )}
          <SubmitButton type="submit" disabled={signUpMutation.isPending}>
            {signUpMutation.isPending ? t('auth.signup.submitting') : t('auth.signup.submit')}
          </SubmitButton>
        </Form>
      </FormWrapper>
      <Footer/>
    </Wrapper>
  )
}

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
