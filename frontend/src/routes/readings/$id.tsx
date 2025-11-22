import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { getInterpretation } from '../../backend/api'
import type { Card } from '../../backend/models'
import { CardDisplay } from '../../components/CardDisplay.tsx'
import { cardLabel } from '../../util/cards.ts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addReading, getSavedReadings, removeReading } from '../../backend/savedReadings.ts'
import Markdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import styled from 'styled-components'

export const Route = createFileRoute('/readings/$id')({
  component: ReadingDetails
})

export default function ReadingDetails () {
  const { id } = useParams({ from: '/readings/$id' }) as { id: string }
  const queryClient = useQueryClient()
  const navigate = useNavigate()
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

  const query = useQuery({
    queryKey: ['readings', id],
    queryFn: async ({ queryKey }) => {
      if (!getSavedReadings().includes(id)) {
        addReading(id)
        await queryClient.invalidateQueries({ queryKey: ['readings'] })
      }
      const response = await getInterpretation(queryKey[1])
      // error handling de milhões!!!
      if (response.error === 'Not found') {
        removeMutation.mutate()
        throw new Error('Reading not found')
      }
      if (!response.done) {
        queryClient.setQueryData(['readings', id], response)
        throw 'not done'
      }
      return response
    },
    retry: (_retries, error) => error as unknown as string === 'not done',
    retryDelay: 1000
  })

  const reading = query.data?.reading ?? null

  return (
    <ReadingContainer>
      {reading && (
        <>
          <ReadingTitle>{reading.question}</ReadingTitle>
          <MiniHeading style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>
              Embaralhado {reading.shuffledTimes} vez{reading.shuffledTimes === 1 ? '' : 'es'} · Pergunta feita em {new Date(reading.createdAt).toLocaleString()}
            </span>
            <code>{id}</code>
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
                <Markdown remarkPlugins={[remarkBreaks]}>
                  {query.data?.done ? query.data?.interpretation : 'Aguardando interpretação...'}
                </Markdown>
              </MarkdownContainer>
            </section>
          )}
        </>
      )}
    </ReadingContainer>
  )
}

const ReadingContainer = styled.div`
  height: 100%;
  overflow: auto;
  font-family: "Varta", system-ui, sans-serif;
  margin-top: 0.25rem;
`

const CardBadgeContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
`

const MiniHeading = styled.header`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.65);

`
const MarkdownContainer = styled.div`
  h1, h2, h3, h4, h5, h6 {
    font-family: "Montserrat", sans-serif;
    font-size: 1.12rem;
    font-weight: 600;
    margin: 0.5rem 0;
  }

  ul, ol {
    padding-left: 1rem;
  }
`

const ReadingTitle = styled.h2`
  font-family: "Montserrat", sans-serif;
  font-size: 1.12rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
`

const BadgeSpan = styled.span`
  padding: 0.12rem 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.1);
  font-size: 0.75rem;
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
