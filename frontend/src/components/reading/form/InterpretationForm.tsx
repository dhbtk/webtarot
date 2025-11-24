import React, { useMemo, useState } from 'react'
import { Form, Label, SubmitButton, Textarea } from './form.tsx'
import { type Card, type CreateInterpretationRequest, getAllArcana } from '../../../backend/models.ts'
import { arcanaImage, arcanaLabel, cardLabel } from '../../../util/cards.ts'
import styled from 'styled-components'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createInterpretation } from '../../../backend/api.ts'
import { useRouter } from '@tanstack/react-router'
import { addToHistory, getSavedReadings, saveReadings } from '../../../backend/savedReadings.ts'

const allArcana = getAllArcana()
const mappedArcana = allArcana.map((arc, index) => ({ name: arcanaLabel(arc), id: index }))

export default function InterpretationForm () {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [question, setQuestion] = useState('')
  const [cards, setCards] = useState<Card[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredArcana = useMemo(() => {
    return mappedArcana.filter(arc => !cards.some(card => arcanaLabel(card.arcana) === arc.name))
  }, [cards])

  const submitMutation = useMutation({
    mutationFn: (payload: CreateInterpretationRequest) => createInterpretation(payload),
    onSuccess: async (data) => {
      // persist and refresh lists
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
      const payload: CreateInterpretationRequest = {
        question: question.trim(),
        cards,
      }
      const res = await submitMutation.mutateAsync(payload)
      // reset
      setQuestion('')
      setCards([])
      await router.navigate({ to: '/readings/$id', params: { id: res.interpretationId } })
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create interpretation')
    } finally {
      setSubmitting(false)
    }
  }

  const invertCard = (index: number) => {
    const copy = [...cards]
    copy[index].flipped = !copy[index].flipped
    setCards(copy)
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
        <div>
          <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {cards.map((card, index) => (
              <CardContainer key={index}>
                <CardImage src={arcanaImage(card.arcana)} alt={arcanaLabel(card.arcana)}
                           className={card.flipped ? 'flipped' : ''}/>
                <CardLabel style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <span style={{ flex: 1 }}>{cardLabel(card)}</span>
                  <RoundPurpleButton type="button" onClick={() => invertCard(index)}>
                    🔃
                  </RoundPurpleButton>
                  <RoundPurpleButton type="button"
                                     onClick={() => setCards(cards.filter((_, i) => i !== index))}>
                    Ⓧ
                  </RoundPurpleButton>
                </CardLabel>
              </CardContainer>
            ))}
          </div>
          <Select
            value={''}
            onChange={e => {
              setCards([...cards, { arcana: allArcana[Number(e.target.value)], flipped: false }])
            }}
          >
            <option value="">Selecione uma carta</option>
            {filteredArcana.map(arc => (<option key={arc.id} value={arc.id}>{arc.name}</option>))}
          </Select>
        </div>
      </Label>
      <SubmitButton
        type="submit"
        disabled={submitting || !question.trim() || cards.length === 0}
      >
        {submitting ? 'Interpretando…' : 'Interpretar'}
      </SubmitButton>
      {error && <div style={{ color: 'var(--color-error)', fontSize: 'var(--fs-xs)' }}>{error}</div>}
    </Form>
  )
}

const CardContainer = styled.div`
  perspective: 1000px;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
`

const CardImage = styled.img`
  width: 4rem;
  transition: transform var(--anim-duration) var(--anim-function);
  backface-visibility: hidden;

  &.flipped {
    transform: rotateZ(180deg);
  }
`

const CardLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  span {
    font-family: var(--font-sans);
    font-size: var(--fs-base);
    font-weight: 500;
  }
`

const RoundPurpleButton = styled.button`
  background-color: rgb(var(--panel-purple-rgb) / 0.7);
  font-family: var(--font-sans);
  font-size: var(--fs-sm);
  padding: 0.25rem;
  border-radius: 50%;
  text-align: center;
  width: 1.5rem;
  height: 1.5rem;
  outline: none;
  border: 1px solid rgb(var(--white-rgb) / 0.1);
  box-shadow: 0 0 2px 2px transparent;
  transition: all 0.25s ease-in-out;

  &:hover {
    background-color: rgb(var(--panel-purple-rgb) / 0.8);
    box-shadow: 0 0 2px 2px rgb(var(--white-rgb) / 0.3);
  }

  &:active {
    background-color: rgb(var(--panel-purple-rgb) / 0.9);
    box-shadow: 0 0 2px 2px rgb(var(--white-rgb) / 0.5);
  }
`

const Select = styled.select`
  font-family: var(--font-sans-alt);
  font-size: var(--fs-sm);
  background: rgb(var(--black-rgb) / 0.2);
  border: 1px solid rgb(var(--accent-rgb) / 0.5);
  border-radius: 6px;
  resize: none;
  padding: 0.5rem;
  box-shadow: 0 0 2px 2px transparent;
  transition: box-shadow 0.25s ease-in-out;
  width: 100%;

  &:hover {
    box-shadow: 0 0 2px 2px rgb(var(--accent-rgb) / 0.5);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 2px 2px rgb(var(--accent-rgb));
  }
`
