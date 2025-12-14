import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import React from 'react'
import {
  Form,
  FormWrapper,
  Input,
  InputWrapper,
  Label,
  PageWrapper,
  SubmitButton,
  Textarea,
} from '../components/reading/form/form'
import { useTranslation } from 'react-i18next'
import { useCurrentUserQuery, useUpdateUserMutation } from '../backend/queries'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '../backend/models'
import { useUser } from '../context/useUser'
import { Footer } from '../components/layout/Footer.tsx'

export const Route = createFileRoute('/profile')({
  component: RouteComponent,
  beforeLoad: ({ context }) => {
    // Guard route: if user is anonymous (from initial stored state), redirect to /login
    const storedUser: User | undefined = (context as { user?: User } | undefined)?.user
    if (storedUser && 'anonymous' in storedUser) {
      throw redirect({ to: '/login' })
    }
  },
})

function RouteComponent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user: ctxUser, setUser } = useUser()
  const queryClient = useQueryClient()

  const userQuery = useQuery(useCurrentUserQuery())
  const updateMutation = useMutation(useUpdateUserMutation())

  const authenticated = 'authenticated' in ctxUser

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
    const u =
      userQuery.data && 'authenticated' in userQuery.data
        ? userQuery.data.authenticated
        : 'authenticated' in ctxUser
          ? ctxUser.authenticated
          : undefined
    if (u) {
      setName(u.name || '')
      setEmail(u.email || '')
      setSelfDescription(u.selfDescription || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userQuery.data, authenticated])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    if (!name || !email || updateMutation.isPending) return
    updateMutation.mutate(
      { name, email, selfDescription },
      {
        onSuccess: (updated) => {
          // Reflect updated user in context (token preserved by context implementation)
          setUser(updated)
          // Update the cached current user query so the rest of the app sees fresh data
          queryClient.setQueryData(['auth'], updated)
          // Optionally refetch to ensure we have canonical data from backend (in case of server-side normalization)
          void queryClient.invalidateQueries({ queryKey: ['auth'] })
          setSaved(true)
        },
      },
    )
  }

  if (!authenticated) return null

  return (
    <PageWrapper>
      <FormWrapper>
        <h2>{t('profile.title', 'Profile')}</h2>
        <Form onSubmit={onSubmit}>
          <Label>
            <span>{t('profile.nameLabel', 'Name')}</span>
            <InputWrapper>
              <Input
                type="text"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t('profile.namePlaceholder', 'Your name')}
              />
            </InputWrapper>
          </Label>
          <Label>
            <span>{t('profile.emailLabel', 'Email')}</span>
            <InputWrapper>
              <Input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e: { target: { value: string } }) => setEmail(e.target.value)}
                required
                placeholder={t('profile.emailPlaceholder', 'you@example.com')}
              />
            </InputWrapper>
          </Label>
          <Label>
            <span>{t('profile.selfDescriptionLabel', 'About you')}</span>
            <InputWrapper>
              <Textarea
                name="selfDescription"
                value={selfDescription}
                onChange={(e) => setSelfDescription(e.target.value)}
                rows={10}
                placeholder={t('profile.selfDescriptionPlaceholder', 'Tell us a bit about you')}
              />
            </InputWrapper>
          </Label>
          {updateMutation.error && (
            <div
              role="alert"
              aria-live="assertive"
              style={{ color: 'salmon', fontSize: 'var(--fs-xs)' }}
            >
              {(updateMutation.error as Error).message ||
                t('profile.error', 'Could not update profile')}
            </div>
          )}
          {saved && !updateMutation.isPending && (
            <div
              role="status"
              aria-live="polite"
              style={{ color: 'palegreen', fontSize: 'var(--fs-xs)' }}
            >
              {t('profile.saved', 'Profile updated!')}
            </div>
          )}

          <SubmitButton type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending
              ? t('profile.submitting', 'Saving...')
              : t('profile.submit', 'Save changes')}
          </SubmitButton>
        </Form>
      </FormWrapper>
      <Footer />
    </PageWrapper>
  )
}
