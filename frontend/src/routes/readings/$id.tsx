import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { getInterpretation } from '../../backend/api'
import type { Card } from '../../backend/models'
import { CardDisplay } from '../../components/CardDisplay.tsx'
import { cardLabel } from '../../util/cards.ts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSavedReadings, removeReading } from '../../backend/savedReadings.ts'

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
            <button onClick={() => removeMutation.mutate()} style={{ fontSize: 12, padding: '0.25rem 0.5rem', background: '#eaeaea', color: '#6b7280', border: 0, borderRadius: 6 }}>
              &times;
            </button>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
            <span>
              Embaralhado {reading.shuffledTimes} vez{reading.shuffledTimes === 1 ? '' : 'es'} · Pergunta feita em {new Date(reading.createdAt).toLocaleString()}
            </span>
            <code style={{ color: '#6b7280', fontSize: 12 }}>{id}</code>
          </div>

          {reading && (
            <section style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Cards ({reading.cards.length})</div>
                <CardDisplay cards={reading.cards} uuid={reading.id} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {reading.cards.map((c, i) => (
                    <CardBadge key={i} card={c} />
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Interpretação</div>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {query.data?.done ? query.data?.interpretation : 'Aguardando...'}
            </pre>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function CardBadge({ card }: { card: Card }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.25rem 0.5rem',
        border: '1px solid #e5e7eb',
        borderRadius: 999,
        background: '#fff',
        fontSize: 12,
      }}
      title={cardLabel(card)}
    >
      {cardLabel(card)}
    </span>
  )
}
