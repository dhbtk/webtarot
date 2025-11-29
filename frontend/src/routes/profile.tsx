import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import React from 'react'
import styled from 'styled-components'
import { Form, FormWrapper, Label, SubmitButton, Textarea } from '../components/reading/form/form'
import { useTranslation } from 'react-i18next'
import { useCurrentUserQuery, useUpdateUserMutation } from '../backend/queries'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { User } from '../backend/models'
import { useUser } from '../context/UserContext'

export const Route = createFileRoute('/profile')({
  component: RouteComponent,
  beforeLoad: ({ context }) => {
    // Guard route: if user is anonymous (from initial stored state), redirect to /login
    const storedUser: User | undefined = (context as any)?.user
    if (storedUser && (storedUser as any).anonymous) {
      throw redirect({ to: '/login' })
    }
  },
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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user: ctxUser, setUser } = useUser()

  const userQuery = useQuery(useCurrentUserQuery())
  const updateMutation = useMutation(useUpdateUserMutation())

  const authenticated = (ctxUser as any).authenticated

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [selfDescription, setSelfDescription] = React.useState('')
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    if (!authenticated) {
      // If the context says anonymous, redirect to login
      void navigate({ to: '/login', replace: true })
      return
    }
    const u = (userQuery.data as any)?.authenticated || (ctxUser as any).authenticated
    if (u) {
      setName(u.name || '')
      setEmail(u.email || '')
      setSelfDescription(u.selfDescription || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userQuery.data, authenticated])

  async function onSubmit (e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    if (!name || !email || updateMutation.isPending) return
    updateMutation.mutate(
      { name, email, selfDescription },
      {
        onSuccess: (updated) => {
          // Reflect updated user in context (token preserved by context implementation)
          setUser(updated)
          setSaved(true)
        },
      }
    )
  }

  if (!authenticated) return null

  return (
    <Wrapper>
      <FormWrapper>
        <h2>{t('profile.title', 'Profile')}</h2>
        <Form onSubmit={onSubmit}>
          <Label>
            <span>{t('profile.nameLabel', 'Name')}</span>
            <Input
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={t('profile.namePlaceholder', 'Your name')}
            />
          </Label>
          <Label>
            <span>{t('profile.emailLabel', 'Email')}</span>
            <Input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('profile.emailPlaceholder', 'you@example.com')}
            />
          </Label>
          <Label>
            <span>{t('profile.selfDescriptionLabel', 'About you')}</span>
            <Textarea
              name="selfDescription"
              defaultValue={selfDescription}
              value={selfDescription}
              onChange={(e) => setSelfDescription(e.target.value)}
              rows={4}
              placeholder={t('profile.selfDescriptionPlaceholder', 'Tell us a bit about you')}
            />
          </Label>
          {updateMutation.error && (
            <div role="alert" aria-live="assertive" style={{ color: 'salmon', fontSize: 'var(--fs-xs)' }}>
              {(updateMutation.error as Error).message || t('profile.error', 'Could not update profile')}
            </div>
          )}
          {saved && !updateMutation.isPending && (
            <div role="status" aria-live="polite" style={{ color: 'palegreen', fontSize: 'var(--fs-xs)' }}>
              {t('profile.saved', 'Profile updated!')}
            </div>
          )}

          <SubmitButton type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? t('profile.submitting', 'Saving...') : t('profile.submit', 'Save changes')}
          </SubmitButton>
        </Form>
      </FormWrapper>
    </Wrapper>
  )
}
