import type { Card } from '../backend/models.ts'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { arcanaLabel } from '../util/cards.ts'

const CARD_WIDTH = 70 * 1.5
const CARD_HEIGHT = 120 * 1.5
const GAP = 10
const ANIMATION_DURATION_PER_CARD = 0.25

const PlayMat = styled.div<{ cards: Card[] }>`
  background: #fafafa;
  position: relative;
  flex: 1;
  height: ${({cards}) => cards.length > 5 ? CARD_HEIGHT * 2 + GAP * 4 : CARD_HEIGHT + 2 * GAP}px;
  container-type: size;
  margin-left: ${-CARD_WIDTH - 2 * GAP}px;
`

const CardDiv = styled.div`
  position: absolute;
  width: ${CARD_WIDTH}px;
  height: ${CARD_HEIGHT}px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  transform-origin: center;
  transition: all ${ANIMATION_DURATION_PER_CARD}s ease-in-out;
  
  &.anchored {
    translate: 0 calc(50cqh - ${CARD_HEIGHT / 2}px) !important;
  }
  
  &.flipped {
    rotate: x 180deg;
  }
  
  .border {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    height: 100%;
    background: #111111;
    color: #fff;
    border-radius: 6px;
    border: 3px solid #fff;
    
    div {
      border-top: 2px solid #fff;
      padding: 0.12rem 0.25rem;
      width: 100%;
      text-align: center;
    }
  }
`

function calculateCardPosition(index: number, total: number): string {
  console.log(`animating ${index}/${total}`)
  if (total < 6) {
    const x = (CARD_WIDTH + GAP * 2) + (index * (CARD_WIDTH + GAP))
    return `${x}px calc(50cqh - ${CARD_HEIGHT / 2}px)`
  } else {
    const half = Math.floor(total / 2)
    if (index === (total - 1) && total % 2 === 1) {
      const x = (CARD_WIDTH + GAP * 2) + ((half + 0.25) * (CARD_WIDTH + GAP))
      return `${x}px calc(50cqh - ${CARD_HEIGHT / 2}px)`
    } else {
      const x = (CARD_WIDTH + GAP * 2) + ((index % half) * (CARD_WIDTH + GAP))
      const y = index < half ? `${GAP}` : `${CARD_HEIGHT + 3 * GAP}`
      console.log(`index: ${index}, total: ${total}, x: ${x}, y: ${y}`)
      return `${x}px ${y}px`
    }
  }
}

const CardWidget: React.FC<{ card: Card, index: number, total: number }> = ({ card, index, total }) => {
  const [className, setClassName] = useState(`anchored${ card.flipped ? ' flipped' : ''}`)
  useEffect(() => {
    setTimeout(() => {
      setClassName(card.flipped ? ' flipped' : '')
    }, (ANIMATION_DURATION_PER_CARD * 1000) * index)
  }, [setClassName])
  return (
    <CardDiv className={className} style={{ translate: calculateCardPosition(index, total) }}>
      <div className="border">
        <div>{arcanaLabel(card.arcana)}</div>
      </div>
    </CardDiv>
  )
}

export const CardDisplay: React.FC<{cards: Card[], uuid: string }> = ({cards, uuid}) => {
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
