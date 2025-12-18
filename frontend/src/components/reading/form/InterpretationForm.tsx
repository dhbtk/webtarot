import React, { useMemo, useRef, useState } from 'react'
import { Form, InputWrapper, Label, SubmitButton, Textarea } from './form.tsx'
import {
  type Card,
  type CreateInterpretationRequest,
  getAllArcana,
} from '../../../backend/models.ts'
import { arcanaImage, arcanaLabel, cardLabel } from '../../../util/cards.ts'
import styled from 'styled-components'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createInterpretation } from '../../../backend/api.ts'
import { useRouter } from '@tanstack/react-router'
import { addToHistory, getSavedReadings, saveReadings } from '../../../backend/savedReadings.ts'
import { CloseOutlined, RedoOutlined } from '@ant-design/icons'
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react'
import Fuse from 'fuse.js'
import { useTranslation } from 'react-i18next'
import { autoPlacement, flip, useFloating } from '@floating-ui/react'

const allArcana = getAllArcana()

export default function InterpretationForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation()
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState('')
  const [cards, setCards] = useState<Card[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mappedArcana = useMemo(
    () =>
      allArcana.map((arc, index) => ({
        name: arcanaLabel(arc),
        id: index,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n.language],
  )
  const filteredArcana = useMemo(() => {
    return mappedArcana.filter(
      (arc) => !cards.some((card) => arcanaLabel(card.arcana) === arc.name),
    )
  }, [cards, mappedArcana])

  const [query, setQuery] = useState('')

  const { refs, floatingStyles, placement, update } = useFloating({
    middleware: [
      flip(), // Automatically flips to the top if no space at the bottom
      autoPlacement({ allowedPlacements: ['top', 'bottom'] }), // Tries to place options where there is most space
    ],
    placement: 'bottom', // Initial placement
  })

  const fuse = useMemo(
    () =>
      new Fuse(filteredArcana, {
        keys: ['name'],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [filteredArcana],
  )

  const searchedArcana = useMemo(() => {
    const q = query.trim()
    if (!q) return filteredArcana
    return fuse.search(q).map((r) => r.item)
  }, [filteredArcana, fuse, query])

  const submitMutation = useMutation({
    mutationFn: (payload: CreateInterpretationRequest) => createInterpretation(payload),
    onSuccess: async (data) => {
      // persist and refresh lists
      saveReadings([...getSavedReadings(), data.interpretationId])
      addToHistory(data.interpretationId)
      await queryClient.invalidateQueries({ queryKey: ['readings'] })
    },
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload: CreateInterpretationRequest = {
        question: question.trim(),
        cards,
        context,
        backend: 'gemini',
      }
      const res = await submitMutation.mutateAsync(payload)
      // reset
      setQuestion('')
      setCards([])
      await router.navigate({ to: '/readings/$id', params: { id: res.interpretationId } })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('errors.createInterpretation')
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const invertCard = (index: number) => {
    const copy = [...cards]
    copy[index].flipped = !copy[index].flipped
    setCards(copy)
  }

  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <Form onSubmit={onSubmit}>
      <Label as={'label'}>
        <span>{t('reading.form.questionLabel')}</span>
        <InputWrapper>
          <Textarea
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('reading.form.questionPlaceholder')}
            rows={4}
          />
        </InputWrapper>
      </Label>
      <Label as={'label'}>
        <span>{t('reading.form.contextLabel')}</span>
        <InputWrapper>
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={t('reading.form.contextPlaceholder')}
            rows={4}
          />
        </InputWrapper>
      </Label>
      <Label>
        <span>{t('reading.form.cardsLabel')}</span>
        <div>
          <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {cards.map((card, index) => (
              <CardContainer key={index}>
                <CardImage
                  src={arcanaImage(card.arcana)}
                  alt={arcanaLabel(card.arcana)}
                  className={card.flipped ? 'flipped' : ''}
                />
                <CardLabel
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}
                >
                  <span style={{ flex: 1 }}>{cardLabel(card)}</span>
                  <RoundPurpleButton type="button" onClick={() => invertCard(index)}>
                    <RedoOutlined />
                  </RoundPurpleButton>
                  <RoundPurpleButton
                    type="button"
                    onClick={() => setCards(cards.filter((_, i) => i !== index))}
                  >
                    <CloseOutlined />
                  </RoundPurpleButton>
                </CardLabel>
              </CardContainer>
            ))}
          </div>
          <Combobox<{ id: number; name: string } | null>
            value={null}
            onChange={(arc) => {
              if (arc) {
                setCards([...cards, { arcana: allArcana[arc.id], flipped: false }])
                setQuery('')
                setTimeout(() => {
                  inputRef.current?.focus()
                  inputRef.current?.scrollIntoView({ behavior: 'smooth' })
                }, 0)
              }
            }}
          >
            {({ open }) => (
              <ComboWrapper ref={refs.setReference}>
                <InputWrapper>
                  <ComboboxInput
                    as={ComboInput}
                    placeholder={t('common.combobox.selectCard')}
                    displayValue={() => ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setQuery(e.target.value)
                      update()
                    }}
                    ref={inputRef}
                  />
                </InputWrapper>
                {open && (
                  <ComboboxOptions
                    as={Options}
                    ref={refs.setFloating}
                    style={{
                      flexDirection: placement === 'bottom' ? 'column' : 'column-reverse',
                      ...floatingStyles,
                    }}
                  >
                    {searchedArcana.length === 0 && (
                      <EmptyOption>{t('common.combobox.noResults')}</EmptyOption>
                    )}
                    {searchedArcana.map((arc) => (
                      <ComboboxOption key={arc.id} value={arc} as={Option}>
                        {arc.name}
                      </ComboboxOption>
                    ))}
                  </ComboboxOptions>
                )}
              </ComboWrapper>
            )}
          </Combobox>
        </div>
      </Label>
      <SubmitButton type="submit" disabled={submitting || !question.trim() || cards.length === 0}>
        {submitting ? t('reading.interpretation.submitting') : t('reading.interpretation.submit')}
      </SubmitButton>
      {error && (
        <div style={{ color: 'var(--color-error)', fontSize: 'var(--fs-xs)' }}>{error}</div>
      )}
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
  height: calc((527 / 300) * 4rem);
  transition: transform var(--anim-duration) var(--anim-function);
  backface-visibility: hidden;
  border-radius: 6px;
  box-shadow: 0 0 2px 2px rgb(var(--black-rgb) / 0.2);

  &.flipped {
    transform: rotateZ(180deg);
  }

  // card back using ::after?

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #b91c1c;
    border-radius: 6px;
    backface-visibility: hidden;
    transform: rotateY(180deg);
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
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &:hover {
    background-color: rgb(var(--panel-purple-rgb) / 0.8);
    box-shadow: 0 0 2px 2px rgb(var(--white-rgb) / 0.3);
  }

  &:active {
    background-color: rgb(var(--panel-purple-rgb) / 0.9);
    box-shadow: 0 0 2px 2px rgb(var(--white-rgb) / 0.5);
  }

  svg {
    width: 0.75rem;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    box-shadow: 3px 3px 6px 2px rgb(var(--black-rgb) / 0.2);
  }
`

// Old Select styles removed after migrating to Combobox

// Headless UI Combobox styles
const ComboWrapper = styled.div`
  position: relative;
`

const ComboInput = styled.input`
  width: 100%;
  font-family: var(--font-sans-alt);
  font-size: var(--fs-sm);
  background: rgb(var(--black-rgb) / 0.2);
  border: 1px solid rgb(var(--accent-rgb) / 0.5);
  border-radius: 6px;
  padding: 0.5rem;
  box-shadow: 0 0 2px 2px transparent;
  transition: box-shadow 0.25s ease-in-out;
  color: rgb(var(--white-rgb) / 0.75);

  &:hover {
    box-shadow: 0 0 2px 2px rgb(var(--accent-rgb) / 0.5);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 2px 2px rgb(var(--accent-rgb));
  }
`

const Options = styled.ul`
  position: absolute;
  margin-top: 0.25rem;
  z-index: 20;
  max-height: 14rem;
  overflow: auto;
  width: 100%;
  min-height: 2rem;
  list-style: none;
  padding: 0.25rem;
  margin: 0.25rem 0 0 0;
  background: rgb(var(--black-rgb) / 0.6);
  backdrop-filter: blur(4px);
  border: 1px solid rgb(var(--accent-rgb) / 0.5);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
`

const Option = styled.li`
  padding: 0.4rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: var(--fs-sm);
  display: block;

  &[data-headlessui-state~='active'] {
    background: rgb(var(--panel-purple-rgb) / 0.6);
  }
`

const EmptyOption = styled.div`
  padding: 0.4rem 0.5rem;
  font-size: var(--fs-sm);
  color: rgb(var(--white-rgb) / 0.7);
`
