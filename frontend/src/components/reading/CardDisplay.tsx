import type { Card } from '../../backend/models.ts'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { arcanaImage } from '../../util/cards.ts'
import cardBackUrl from '../../assets/cardimages/CardBacks.jpg'

export const CARD_WIDTH = 300 / 3.3
export const CARD_HEIGHT = 527 / 3.3
const GAP = 12
const ANIMATION_DURATION_PER_CARD = 0.4

const PlayMat = styled.div<{ cards: Card[] }>`
  position: relative;
  flex: 1;
  height: ${({ cards }) => cards.length > 5 ? CARD_HEIGHT * 2 + GAP * 4 : CARD_HEIGHT + 2 * GAP}px;
  container-type: size;
  margin-left: ${-CARD_WIDTH - 2 * GAP}px;
  overflow-x: auto;
`

export const CardDiv = styled.div`
  position: absolute;
  width: ${CARD_WIDTH}px;
  height: ${CARD_HEIGHT}px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  transform-origin: center;
  transform-style: preserve-3d;
  transition: all ${ANIMATION_DURATION_PER_CARD}s cubic-bezier(0.65, 0, 0.35, 1);
  background-size: cover;
  transform: rotateY(180deg);
  box-shadow: 5px 5px 5px 0 rgba(0, 0, 0, 0.25);

  &.anchored {
    translate: 0 calc(50cqh - ${CARD_HEIGHT / 2}px) !important;
  }

  &.flipped {
    transform: rotateX(180deg) rotateY(0);
    box-shadow: -5px -5px 5px 0 rgba(0, 0, 0, 0.25);

    &.revealed {
      transform: rotateX(180deg) rotateY(180deg);
    }
  }

  &.revealed {
    transform: rotateY(0);
  }

  .border {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    height: 100%;
    color: var(--color-white);
    border-radius: 6px;
    border: 3px solid var(--color-white);

    div {
      border-top: 2px solid var(--color-white);
      padding: 0.12rem 0.25rem;
      width: 100%;
      text-align: center;
    }
  }
`

export const CardImage = styled.div`
  background-size: cover;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  position: absolute;
  border-radius: 6px;
`

export const CardBack = styled.div`
  background-image: url(${cardBackUrl});
  background-size: cover;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: rotateY(180deg);
  backface-visibility: hidden;
  position: absolute;
  border-radius: 6px;
`

function calculateCardPosition (index: number, total: number): string {
  if (total < 6) {
    const x = (CARD_WIDTH + GAP * 2) + (index * (CARD_WIDTH + GAP))
    return `${x}px calc(50cqh - ${CARD_HEIGHT / 2}px)`
  } else {
    if (total % 2 === 1) {
      const half = Math.ceil(total / 2)
      const x = (CARD_WIDTH + GAP * 2) + ((index % half) * (CARD_WIDTH + GAP)) + (index >= half ? (CARD_WIDTH / 2 + GAP / 2) : 0)
      const y = index < half ? `${GAP}` : `${CARD_HEIGHT + 3 * GAP}`
      return `${x}px ${y}px`
    } else {
      const half = Math.floor(total / 2)
      const x = (CARD_WIDTH + GAP * 2) + ((index % half) * (CARD_WIDTH + GAP))
      const y = index < half ? `${GAP}` : `${CARD_HEIGHT + 3 * GAP}`
      return `${x}px ${y}px`
    }
  }
}

const CardWidget: React.FC<{ card: Card, index: number, total: number }> = ({ card, index, total }) => {
  const [className, setClassName] = useState(`anchored${card.flipped ? ' flipped' : ''}`)
  useEffect(() => {
    setTimeout(() => {
      setClassName(card.flipped ? ' flipped' : '')
    }, (ANIMATION_DURATION_PER_CARD * 1000) * index)
    setTimeout(() => {
      setClassName(card.flipped ? 'revealed flipped' : 'revealed')
    }, (ANIMATION_DURATION_PER_CARD * 1000 * total) + (ANIMATION_DURATION_PER_CARD * 1000) * index)
  }, [setClassName])
  return (
    <CardDiv className={className} style={{ translate: calculateCardPosition(index, total) }}>
      <CardImage style={{ backgroundImage: `url(${arcanaImage(card.arcana)})` }}/>
      <CardBack/>
    </CardDiv>
  )
}

export const CardDisplay: React.FC<{ cards: Card[], uuid: string }> = ({ cards, uuid }) => {
  return (
    <PlayMat cards={cards}>
      {cards.map((card, index) => {
        return (
          <CardWidget key={`${uuid}-${index}`} index={index} total={cards.length} card={card}/>
        )
      })}
    </PlayMat>
  )
}
