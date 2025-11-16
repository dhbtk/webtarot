import React, { useState } from 'react'
import { createReading } from '../backend/api'
import type { CreateReadingRequest } from '../backend/models'
import { useRouter } from '@tanstack/react-router'

export default function ReadingForm() {
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [cards, setCards] = useState(3)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload: CreateReadingRequest = { question: question.trim(), cards }
      const res = await createReading(payload)
      // Navigate to /readings/:id using the returned interpretationId
      await router.navigate({ to: '/readings/$id', params: { id: res.interpretationId } })
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create reading')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: '0.5rem' }}>
      <label style={{ display: 'grid', gap: '0.25rem' }}>
        <span style={{ fontSize: 12, color: '#6b7280' }}>Question</span>
        <textarea
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What guidance do you seek?"
          rows={4}
          style={{ resize: 'vertical', padding: '0.5rem', borderRadius: 6, border: '1px solid #e5e7eb' }}
        />
      </label>
      <label style={{ display: 'grid', gap: '0.25rem' }}>
        <span style={{ fontSize: 12, color: '#6b7280' }}>Cards</span>
        <input
          type="number"
          min={1}
          max={10}
          value={cards}
          onChange={(e) => setCards(Number(e.target.value))}
          style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #e5e7eb' }}
        />
      </label>
      <button
        type="submit"
        disabled={submitting || !question.trim()}
        style={{ padding: '0.5rem 0.75rem', borderRadius: 6, background: '#111827', color: 'white', border: 0 }}
      >
        {submitting ? 'Shuffling…' : 'Create Reading'}
      </button>
      {error && <div style={{ color: '#b91c1c', fontSize: 12 }}>{error}</div>}
    </form>
  )
}
