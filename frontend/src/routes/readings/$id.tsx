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
import { useEffect } from 'react'
import { ReadingSubLayout } from '../../components/reading/layout/ReadingSubLayout.tsx'
import { CardSpinner } from '../../components/reading/CardSpinner.tsx'
import { getUserId } from '../../backend/userId.ts'
import type { InterpretationsWebsocketMessage } from '../../backend/models.ts'
import { isInterpretationsWebsocketMessage } from '../../backend/models.ts'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/readings/$id')({
  component: ReadingDetails
})

export default function ReadingDetails () {
  const { id } = useParams({ from: '/readings/$id' }) as { id: string }
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { t } = useTranslation()
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
  }, [id])

  useEffect(() => {
    const url = new URL('/api/v1/interpretation/notify', window.location.href)
    url.protocol = url.protocol.replace('http', 'ws')
    const websocket = new WebSocket(url.href, [getUserId()])

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
          websocket.close()
        }
      }
    }

    return () => websocket.close()
  }, [id])

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

  return (
    <ReadingSubLayout>
      <ReadingContainer>
        {reading && (
          <>
            <ReadingTitle>{reading.question}</ReadingTitle>
            <MiniHeading style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {t('reading.details.askedAt', { date: new Date(reading.createdAt).toLocaleString() })}
            </span>
              <span>
                {t('reading.details.shuffledTimes', { count: reading.shuffledTimes })}
              </span>
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

const ReadingContainer = styled.div`
  height: 100%;
  overflow: auto;
  font-family: var(--font-sans-alt);
  padding-top: 0.25rem;
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
  }

  strong {
    font-weight: 900;
    color: rgb(var(--white-rgb) / 0.92);
  }
`

const ReadingTitle = styled.h2`
  font-family: var(--font-sans);
  font-size: var(--fs-lg);
  font-weight: 600;
  margin: 0 0 0.5rem;
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
