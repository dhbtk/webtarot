import React from 'react'
import { type Interpretation, interpretationReading, interpretationText } from '../../../backend/models.ts'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { arcanaImage } from '../../../util/cards.ts'
import { Link } from '@tanstack/react-router'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: rgba(82, 69, 150, 0.7);
  padding: 1rem;
  box-shadow: 0.5rem 0.5rem 0.75rem 0 rgba(0, 0, 0, 0.25);
  border-radius: 0.75rem;
  opacity: 0;
  animation: slide-from-bottom var(--anim-duration) var(--anim-function) forwards;
  gap: 0.5rem;

  @media (max-width: 768px) {
    padding: 0.5rem;
    border-radius: 0;
  }
`

const ReadingDate = styled.div`
  font-size: var(--fs-xs);
  font-family: var(--font-sans-alt);
  color: rgb(var(--white-rgb) / 0.65);
`

const ReadingQuestion = styled(Link)`
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
  gap: 0.25rem;
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

export const ReadingListItem: React.FC<{ interpretation: Interpretation }> = ({ interpretation }) => {
  const { t } = useTranslation()
  const reading = interpretationReading(interpretation)
  const interpretationStr = interpretationText(interpretation)
  return (
    <Container>
      <ReadingDate>
        {t('reading.list.askedAt', { date: new Date(reading.createdAt).toLocaleString() })}
        {reading.shuffledTimes > 0 ? <>
          {' '}&bull;{' '}
          {t('reading.details.shuffledTimes', { count: reading.shuffledTimes })}
        </> : t('reading.details.userReading')}

      </ReadingDate>
      <ReadingQuestion to="/readings/$id" params={{ id: reading.id }} title={reading.question}>
        {reading.question}
      </ReadingQuestion>
      <CardImageContainer>
        {reading.cards.map((card, i) => <CardImage key={i} className={card.flipped ? 'flipped' : ''}
                                                   src={arcanaImage(card.arcana)}/>)}
      </CardImageContainer>
      {/* TODO: strip markdown from abbreviated interpretation */}
      <AbbreviatedInterpretation>{interpretationStr}</AbbreviatedInterpretation>
    </Container>
  )
}
