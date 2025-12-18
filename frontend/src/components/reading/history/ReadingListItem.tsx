import React, { useEffect, useState } from 'react'
import {
  type Interpretation,
  interpretationReading,
  interpretationText,
} from '../../../backend/models.ts'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { arcanaImage } from '../../../util/cards.ts'
import { Link } from '@tanstack/react-router'
import { remark } from 'remark'
import strip from 'strip-markdown'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteInterpretation } from '../../../backend/api.ts'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: rgba(82, 69, 150, 0.7);
  padding: 1rem;
  box-shadow: 0.5rem 0.5rem 0.75rem 0 rgba(0, 0, 0, 0.25);
  border-radius: 0.75rem;
  opacity: 0;
  animation: slide-from-right var(--anim-duration) var(--anim-function) forwards;
  gap: 0.5rem;

  @media (max-width: 768px) {
    padding: 0.5rem;
    border-radius: 0;
  }

  a {
    font-size: var(--fs-md);
    color: rgb(var(--white-rgb) / 0.87);
    font-weight: 500;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;

    &:hover {
      text-decoration: underline;
      color: rgb(var(--white-rgb) / 1);
    }
  }
`

const ReadingDate = styled.div`
  font-size: var(--fs-xs);
  font-family: var(--font-sans-alt);
  color: rgb(var(--white-rgb) / 0.65);
`

const CardImage = styled.img`
  width: 2rem;
  height: calc((527 / 300) * 2rem);
  transition: transform var(--anim-duration) var(--anim-function);
  backface-visibility: hidden;
  border-radius: 6px;
  box-shadow: 0 0 2px 2px rgb(var(--black-rgb) / 0.2);

  &.flipped {
    transform: rotateZ(180deg);
  }

  @starting-style {
    transform: rotateY(180deg);
  }

  @media (min-width: 768px) {
    width: 3rem;
    height: calc((527 / 300) * 3rem);
  }
`

const CardImageContainer = styled.div`
  display: flex;
  align-items: center;
  overflow: hidden;
  gap: 0.5rem;
`

const InterpretationWrapper = styled.div`
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  background: rgb(var(--white-rgb) / 0.08);
  box-shadow: 3px 3px 6px 2px rgb(var(--black-rgb) / 0.2);
`

const AbbreviatedInterpretation = styled.pre`
  font-size: var(--fs-sm);
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  font-family: var(--font-sans-alt);
  white-space: pre-wrap;
`

export const ReadingListItem: React.FC<{ interpretation: Interpretation; index: number }> = ({
  interpretation,
  index,
}) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const reading = interpretationReading(interpretation)
  const interpretationStr = interpretationText(interpretation)
  const [strippedInterpretation, setStrippedInterpretation] = useState('')
  useEffect(() => {
    remark()
      .use(strip)
      .process(interpretationStr)
      .then((result) => setStrippedInterpretation(String(result)))
  }, [interpretation, interpretationStr])
  return (
    <Container style={{ animationDelay: `calc(${index % 5} * 0.5 * var(--anim-duration))` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <ReadingDate>
          {t('reading.list.askedAt', { date: new Date(reading.createdAt).toLocaleString() })} &bull;{' '}
          {reading.shuffledTimes > 0 ? (
            <>{t('reading.details.shuffledTimes', { count: reading.shuffledTimes })}</>
          ) : (
            t('reading.details.userReading')
          )}
        </ReadingDate>
        <DeleteButton
          id={reading.id}
          onDeleted={() => queryClient.invalidateQueries({ queryKey: ['history'] })}
        />
      </div>
      <Link to="/readings/$id" params={{ id: reading.id }} title={reading.question}>
        {reading.question}
      </Link>
      <CardImageContainer>
        {reading.cards.map((card, i) => (
          <CardImage
            key={i}
            className={card.flipped ? 'flipped' : ''}
            src={arcanaImage(card.arcana)}
          />
        ))}
      </CardImageContainer>
      <InterpretationWrapper>
        <AbbreviatedInterpretation>{strippedInterpretation}</AbbreviatedInterpretation>
      </InterpretationWrapper>
    </Container>
  )
}

function DeleteButton({
  id,
  onDeleted,
}: {
  id: string
  onDeleted: (id: string) => Promise<void> | void
}) {
  const { t } = useTranslation()
  const mutation = useMutation({
    mutationFn: async () => {
      await deleteInterpretation(id)
      return id
    },
    onSuccess: async (deletedId) => {
      await onDeleted(deletedId)
    },
  })
  return (
    <StyledDeleteButton
      onClick={() => {
        if (confirm(t('history.delete.confirm'))) {
          mutation.mutate()
        }
      }}
      disabled={mutation.isPending}
      title={mutation.isPending ? t('history.delete.deleting') : t('history.delete.delete')}
      style={{
        cursor: mutation.isPending ? 'default' : 'pointer',
      }}
    >
      {mutation.isPending ? t('history.delete.deleting') : t('history.delete.delete')}
    </StyledDeleteButton>
  )
}

const StyledDeleteButton = styled.button`
  font-size: var(--fs-xs);
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid rgb(255 255 255 / 0.3);
  color: inherit;
  border-radius: 6px;

  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 6px;
    box-shadow: 2px 2px 2px 2px rgb(var(--black-rgb) / 0.2);
  }

  &:hover {
    background-position: 100px;
    box-shadow: 0 0 2px 2px rgb(var(--accent-rgb) / 0.5);
  }

  &:active {
    background-position: 150px;
    box-shadow: 0 0 2px 2px rgb(var(--accent-rgb) / 1);
  }
`
