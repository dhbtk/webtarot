import { useEffect, useState } from 'react'
import { createFileRoute, useParams } from '@tanstack/react-router'
import { getInterpretation, pollInterpretation } from '../../backend/api'
import type { Card, GetInterpretationResult } from '../../backend/models'
import { CardDisplay } from '../../components/CardDisplay.tsx'
import { cardLabel } from '../../util/cards.ts'

export const Route = createFileRoute('/readings/$id')({
  component: ReadingDetails
})

export default function ReadingDetails() {
  const { id } = useParams({ from: '/readings/$id' }) as { id: string }
  const [result, setResult] = useState<GetInterpretationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let abort = new AbortController()
    setLoading(true)
    setError(null)

    // First fetch once to show immediate state, then poll until done.
    getInterpretation(id, { signal: abort.signal })
      .then((r) => setResult(r))
      .catch((e) => setError(e?.message ?? 'Failed to fetch'))
      .finally(() => setLoading(false))

    pollInterpretation(id, { signal: abort.signal }).then(setResult).catch((e) => {
      if (e?.name === 'AbortError') return
      setError(e?.message ?? 'Failed to poll interpretation')
    })

    return () => {
      abort.abort()
    }
  }, [id])

  const reading = result?.reading ?? null

  return (
    <div style={{ padding: '1rem', height: '100%', overflow: 'auto' }}>
      {loading && !result && <p style={{ color: '#6b7280' }}>Loading…</p>}
      {reading && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>{reading.question}</h2>
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
              {result?.interpretation || (result?.done ? 'No interpretation.' : 'Awaiting interpretation…')}
            </pre>
              </div>
            </section>
          )}

          {!reading && result && (
            <p style={{ color: '#6b7280', marginTop: '0.75rem' }}>
              No reading details available yet. This page will update automatically.
            </p>
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
