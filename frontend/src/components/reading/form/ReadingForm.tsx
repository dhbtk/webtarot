import React, { useState } from 'react'
import { createReading } from '../../../backend/api.ts'
import type { CreateReadingRequest } from '../../../backend/models.ts'
import { useRouter } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addToHistory, getSavedReadings, saveReadings } from '../../../backend/savedReadings.ts'
import { Form, Label, RoundButton, SubmitButton, Textarea } from './form.tsx'
import { MinusOutlined, PlusOutlined } from '@ant-design/icons'

export default function ReadingForm () {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [question, setQuestion] = useState('')
  const [cards, setCards] = useState(3)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitMutation = useMutation({
    mutationFn: (reading: CreateReadingRequest) => createReading(reading),
    onSuccess: async (data) => {
      saveReadings([...getSavedReadings(), data.interpretationId])
      addToHistory(data.interpretationId)
      await queryClient.invalidateQueries({ queryKey: ['readings'] })
    }
  })

  async function onSubmit (e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload: CreateReadingRequest = { question: question.trim(), cards }
      const res = await submitMutation.mutateAsync(payload)
      // reset
      setQuestion('')
      setCards(3)
      await router.navigate({ to: '/readings/$id', params: { id: res.interpretationId } })
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create reading')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form onSubmit={onSubmit}>
      <Label>
        <span>Pergunta</span>
        <Textarea
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="O que você está buscando saber?"
          rows={4}
        />
      </Label>
      <Label>
        <span>Cartas</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
          <RoundButton type="button" onClick={() => setCards(Math.max(1, cards - 1))}>
            <MinusOutlined/>
          </RoundButton>
          <span style={{ width: '1rem', textAlign: 'center', fontSize: '0.85rem' }}>{cards}</span>
          <RoundButton type="button" onClick={() => setCards(Math.min(13, cards + 1))}>
            <PlusOutlined/>
          </RoundButton>
        </div>
      </Label>
      <SubmitButton
        type="submit"
        disabled={submitting}
      >
        {submitting ? 'Embaralhando…' : 'Perguntar'}
      </SubmitButton>
      {error && <div style={{ color: 'var(--color-error)', fontSize: 'var(--fs-xs)' }}>{error}</div>}
    </Form>
  )
}
