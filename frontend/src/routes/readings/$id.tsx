import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { getInterpretation } from '../../backend/api'
import type { Card } from '../../backend/models'
import { CardDisplay } from '../../components/reading/CardDisplay.tsx'
import { cardLabel } from '../../util/cards.ts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addReading, getSavedReadings, removeReading } from '../../backend/savedReadings.ts'
import Markdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import styled from 'styled-components'
import { useEffect, useState } from 'react'
import { ReadingSubLayout } from '../../components/reading/layout/ReadingSubLayout.tsx'
import { CardSpinner } from '../../components/reading/CardSpinner.tsx'
import { useUser } from '../../context/useUser'
import type { InterpretationsWebsocketMessage } from '../../backend/models.ts'
import { isInterpretationsWebsocketMessage } from '../../backend/models.ts'
import { useTranslation } from 'react-i18next'
import { getStoredUser } from '../../backend/user.ts'
import logoUrl from '../../assets/logo.png'
import { ShareAltOutlined } from '@ant-design/icons'

export const Route = createFileRoute('/readings/$id')({
  component: ReadingDetails
})

function ReadingDetails () {
  const { id } = useParams({ from: '/readings/$id' }) as { id: string }
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useUser()
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined') return 'unsupported'
    if (!('Notification' in window)) return 'unsupported'
    return Notification.permission
  })

  useEffect(() => {
    // Keep local permission state in sync (in case it changes elsewhere)
    if (!('Notification' in window)) return
    setNotifPermission(Notification.permission)
  }, [])
  const removeMutation = useMutation({
    mutationFn: () => {
      const currentIndex = getSavedReadings().indexOf(id)
      removeReading(id)
      const nextId = getSavedReadings()[currentIndex] ?? null
      return Promise.resolve(nextId)
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ['readings'] })
      if (id !== null) {
        await navigate({ to: `/readings/${id}` })
      } else {
        await navigate({ to: '/readings' })
      }
    }
  })

  useEffect(() => {
    if (!getSavedReadings().includes(id)) {
      addReading(id)
      queryClient.invalidateQueries({ queryKey: ['readings'] })
    }
  }, [id, queryClient])

  useEffect(() => {
    const url = new URL('/api/v1/interpretation/notify', window.location.href)
    url.protocol = url.protocol.replace('http', 'ws')
    const idToSend = 'anonymous' in user ? user.anonymous.id : getStoredUser().accessToken ?? ''
    const websocket = new WebSocket(url.href, [idToSend])

    websocket.onopen = () => {
      console.log('ws connected')
      const msg: InterpretationsWebsocketMessage = { subscribe: { uuid: id } }
      websocket.send(JSON.stringify(msg))
    }

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('ws data', data)
      if (isInterpretationsWebsocketMessage(data) && 'done' in data) {
        if (data.done.uuid === id) {
          queryClient.invalidateQueries({ queryKey: ['readings', id] })
          try {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(t('reading.notification.title'), {
                body: t('reading.notification.body'),
                icon: logoUrl,
              })
            }
          } catch (e) {
            // ignore notification errors
          }
          websocket.close()
        }
      }
    }

    return () => websocket.close()
  }, [id, user, queryClient])

  const query = useQuery({
    queryKey: ['readings', id],
    queryFn: async ({ queryKey }) => {
      const response = await getInterpretation(queryKey[1])
      // error handling de milhões!!!
      if (response.error === 'Not found') {
        removeMutation.mutate()
        throw new Error('Reading not found')
      }
      return response
    },
  })

  const reading = query.data?.reading ?? null
  const isNotifSupported = notifPermission !== 'unsupported'

  const requestNotifications = async () => {
    if (!('Notification' in window)) return
    try {
      const result = await Notification.requestPermission()
      setNotifPermission(result)
    } catch (e) {
      // ignore
    }
  }

  const triggerShare = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : ''
      const title = reading?.question ?? 'webtarot.io'
      const text = title

      if ('share' in navigator && typeof navigator.share === 'function') {
        await navigator.share({ title, text, url })
      } else {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(url)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <ReadingSubLayout>
      <ReadingContainer>
        {reading && (
          <>
            <ReadingTitle>{reading.question}</ReadingTitle>
            <MiniHeading style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {t('reading.details.askedAt', { date: new Date(reading.createdAt).toLocaleString() })}<br/>
              {reading.shuffledTimes > 0 ? t('reading.details.shuffledTimes', { count: reading.shuffledTimes }) : t('reading.details.userReading')}
            </span>
              <ShareButton type="button" onClick={triggerShare}>
                <ShareAltOutlined/>
              </ShareButton>
            </MiniHeading>

            {reading && (
              <section style={{ display: 'grid', gap: '0.75rem' }}>
                <div>
                  <CardDisplay cards={reading.cards} uuid={reading.id}/>
                  <CardBadgeContainer>
                    {reading.cards.map((c, i) => (
                      <CardBadge key={i} card={c}/>
                    ))}
                  </CardBadgeContainer>
                </div>

                <MarkdownContainer>
                  {query.data?.done ? (
                    <Markdown remarkPlugins={[remarkBreaks]}>
                      {query.data?.interpretation}
                    </Markdown>
                  ) : (
                    <>
                      <CardSpinner/>
                      <h3 style={{ textAlign: 'center' }}>{t('reading.details.waiting')}</h3>
                      {isNotifSupported && notifPermission === 'default' && (
                        <NotificationContainer>
                          <NotificationButton type="button" onClick={requestNotifications}>
                            {t('reading.notification.enable')}
                          </NotificationButton>
                        </NotificationContainer>
                      )}
                    </>
                  )}

                </MarkdownContainer>
              </section>
            )}
          </>
        )}
      </ReadingContainer>
    </ReadingSubLayout>
  )
}

const ShareButton = styled.button`
  border-radius: 50%;
  border: 1px solid rgb(var(--white-rgb) / 0.25);
  background: rgb(var(--white-rgb) / 0.08);
  color: inherit;
  box-shadow: 3px 3px 6px 2px rgb(var(--black-rgb) / 0.2);
  font-size: var(--fs-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  margin-right: 1rem;
  transition: all calc(var(--anim-duration) / 5) ease-in-out;

  &:hover {
    background: rgb(var(--white-rgb) / 0.1);
    box-shadow: 3px 3px 6px 2px rgb(var(--black-rgb) / 0.3);
    transform: scale(1.1);
  }
`

const ReadingContainer = styled.div`
  height: 100%;
  overflow: auto;
  font-family: var(--font-sans-alt);
  padding: 0.5rem;
`

const CardBadgeContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
`

const MiniHeading = styled.header`
  font-size: var(--fs-xs);
  color: rgb(var(--white-rgb) / 0.65);

`
const MarkdownContainer = styled.div`
  text-shadow: 2px 1px 3px rgb(var(--black-rgb) / 0.8);

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-sans);
    font-size: var(--fs-md);
    font-weight: 600;
    margin: 0.5rem 0;

    strong {
      font-weight: 700;
    }
  }

  h1 {
    font-size: var(--fs-lg);
  }

  h2 {
    font-size: var(--fs-md);
  }

  h3 {
    font-size: var(--fs-base);
  }

  @media (min-width: 768px) {
    ul, ol {
      padding-left: 1.25rem;

      li {
        padding-left: 0.25rem;
      }
    }
  }

  hr {
    margin: 1rem 2rem;
    border: none;
    border-top: 1px solid rgb(var(--white-rgb) / 0.65);
    box-shadow: 0 0 2px 2px rgb(var(--black-rgb) / 0.2);
  }

  strong {
    font-weight: 900;
    color: rgb(var(--white-rgb) / 0.92);
  }
`

const NotificationContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 0.5rem;
`

const NotificationButton = styled.button`
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  border: 1px solid rgb(var(--white-rgb) / 0.25);
  background: rgb(var(--white-rgb) / 0.08);
  color: inherit;
  box-shadow: 3px 3px 6px 2px rgb(var(--black-rgb) / 0.2);
`

const ReadingTitle = styled.h2`
  font-family: var(--font-sans);
  font-size: var(--fs-lg);
  font-weight: 600;
  margin: 0 0 0.5rem;
  text-shadow: 2px 1px 3px rgb(var(--black-rgb) / 0.8);
`

const BadgeSpan = styled.span`
  padding: 0.12rem 0.5rem;
  border: 1px solid rgb(var(--white-rgb) / 0.1);
  background: rgb(var(--white-rgb) / 0.1);
  font-size: var(--fs-xs);
  border-radius: 6px;
  max-width: max(150px, 15vw);
  display: flex;
  align-items: center;
  padding-top: 4px; // fix for weird vertical alignment
  box-shadow: 3px 3px 6px 2px rgb(var(--black-rgb) / 0.2);
`

function CardBadge ({ card }: { card: Card }) {
  return (
    <BadgeSpan
      title={cardLabel(card)}
    >
      {cardLabel(card)}
    </BadgeSpan>
  )
}
