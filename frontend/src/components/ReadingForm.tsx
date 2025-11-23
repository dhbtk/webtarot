import React, { useState } from 'react'
import { createReading } from '../backend/api'
import type { CreateReadingRequest } from '../backend/models'
import { useRouter } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addToHistory, getSavedReadings, saveReadings } from '../backend/savedReadings.ts'
import styled from 'styled-components'

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
      // Navigate to /readings/:id using the returned interpretationId
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
          <RoundButton type="button" onClick={() => setCards(Math.max(1, cards - 1))}>-</RoundButton>
          <span style={{ width: '1rem', textAlign: 'right', fontSize: '0.85rem' }}>{cards}</span>
          <RoundButton type="button" onClick={() => setCards(Math.min(13, cards + 1))}>+</RoundButton>
        </div>
      </Label>
      <SubmitButton
        type="submit"
        disabled={submitting}
      >
        {submitting ? 'Embaralhando…' : 'Perguntar'}
      </SubmitButton>
      {error && <div style={{ color: '#b91c1c', fontSize: 12 }}>{error}</div>}
    </Form>
  )
}

const Form = styled.form`
  display: grid;
  gap: 0.5rem;
  font-family: "Varta", system-ui, sans-serif;;
`

const Label = styled.div`
  display: grid;
  gap: 0.12rem;

  span {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.65);
  }
`

const Textarea = styled.textarea`
  font-family: "Varta", system-ui, sans-serif;
  font-size: 0.85rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(248, 55, 216, 0.5);
  border-radius: 6px;
  resize: none;
  padding: 0.5rem;
  box-shadow: 0 0 2px 2px transparent;
  transition: box-shadow 0.25s ease-in-out;

  &:focus {
    outline: none;
    box-shadow: 0 0 2px 2px rgb(248, 55, 216);
  }
`

const RoundButton = styled.button`
  font-family: "Montserrat", sans-serif;
  padding: 0.12rem;
  border-radius: 50%;
  text-align: center;
  width: 1.5rem;
  height: 1.5rem;
  outline: none;
  border: none;
  box-shadow: 0 0 2px 2px transparent;
  transition: all 0.25s ease-in-out;

  background: rgba(255, 255, 255, 0.1);

  &:active {
    background: rgba(255, 255, 255, 0.2);
    box-shadow: 0 0 2px 2px rgba(255, 255, 255, 0.5);
  }
`

const SubmitButton = styled.button`
  margin-top: 0.5rem;
  color: rgba(255, 255, 255, 0.75);
  font-family: "Montserrat", sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(174, 146, 248, 0.5), rgba(246, 113, 225, 0.5) 50%, rgba(174, 146, 248, 0.5));
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.15s ease-in-out;

  &:hover {
    background-position: 100px;
    box-shadow: 0 0 2px 2px rgba(248, 55, 216, 0.5);
  }

  &:active {
    background-position: 150px;
    box-shadow: 0 0 2px 2px rgba(248, 55, 216, 1);
  }
`
