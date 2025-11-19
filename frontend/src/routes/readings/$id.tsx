import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { getInterpretation } from '../../backend/api'
import type { Card } from '../../backend/models'
import { CardDisplay } from '../../components/CardDisplay.tsx'
import { cardLabel } from '../../util/cards.ts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSavedReadings, removeReading } from '../../backend/savedReadings.ts'
import Markdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import styled from 'styled-components'

export const Route = createFileRoute('/readings/$id')({
  component: ReadingDetails
})

export default function ReadingDetails() {
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
      const response = await getInterpretation(queryKey[1])
      // error handling de milhões!!!
      if (response.error === "Not found") {
        removeMutation.mutate()
        throw new Error("Reading not found")
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
    <div style={{ padding: '1rem', height: '100%', overflow: 'auto' }}>
      {reading && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>{reading.question}</h2>
            <CloseButton onClick={() => removeMutation.mutate()}>
              &times;
            </CloseButton>
          </div>
          <MiniHeading style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>
              Embaralhado {reading.shuffledTimes} vez{reading.shuffledTimes === 1 ? '' : 'es'} · Pergunta feita em {new Date(reading.createdAt).toLocaleString()}
            </span>
            <code>{id}</code>
          </MiniHeading>

          {reading && (
            <section style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
              <div>
                <MiniHeading>Cards ({reading.cards.length})</MiniHeading>
                <CardDisplay cards={reading.cards} uuid={reading.id} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {reading.cards.map((c, i) => (
                    <CardBadge key={i} card={c} />
                  ))}
                </div>
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
    </div>
  )
}

// { fontSize: 12, padding: '0.25rem 0.5rem', background: '#eaeaea', color: '#6b7280', border: 0, borderRadius: 6 }
const CloseButton = styled.button`
  font-size: 12px;
  padding: 0.25rem 0.5rem;
  background: #eaeaea;
  color: #6b7280;
  border: 0;
  border-radius: 6px;
  
  @media (prefers-color-scheme: dark) {
    background: #374151;
    color: #9ca3af;
  }
`

const MiniHeading = styled.header`
  font-size: 12px;
  color: #6b7280;
  
  @media (prefers-color-scheme: dark) {
    color: #9ca3af;
  }
  `
const MarkdownContainer = styled.div`
  h1, h2, h3, h4, h5, h6 {
    font-size: 110%;
    font-weight: bold;
    margin: 0.5rem 0;
  }
`

const BadgeSpan = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  font-size: 12px;
  
  @media (prefers-color-scheme: dark) {
    background: #1f2937;
    border-color: #374151;
  }
`

function CardBadge({ card }: { card: Card }) {
  return (
    <BadgeSpan
      title={cardLabel(card)}
    >
      {cardLabel(card)}
    </BadgeSpan>
  )
}
