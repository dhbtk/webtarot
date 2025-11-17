import type { Card } from '../backend/models.ts'
import React, { useEffect, useState } from 'react'
import styled, { css, keyframes } from 'styled-components'

const CARD_WIDTH = 70
const CARD_HEIGHT = 120
const GAP = 10
const ANIMATION_DURATION_PER_CARD = 0.25

const PlayMat = styled.div<{ cards: Card[] }>`
  background: #111199;
  position: relative;
  flex: 1;
  height: ${({cards}) => cards.length > 5 ? CARD_HEIGHT * 2 + GAP * 4 : CARD_HEIGHT + 2 * GAP}px;
  container-type: size;
`

const animFactory = (index: number, total: number) => keyframes`
  from {
    translate: ${-CARD_WIDTH - GAP}px calc(50cqh - ${CARD_HEIGHT / 2}px);
  }
  to {
    translate: ${(() => {
      if (total < 6) {
        return `${index * (CARD_WIDTH + GAP)}px calc(50cqh - ${CARD_HEIGHT / 2}px)`
      }
      return ``
    })()}
  }
`

const CardDiv = styled.div`
  position: absolute;
  width: ${CARD_WIDTH}px;
  height: ${CARD_HEIGHT}px;
  background: #111111;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  transform-origin: top left;
  transition: all ${ANIMATION_DURATION_PER_CARD}s ease-in-out;
`

const CardWidget: React.FC<{ card: Card, index: number, total: number }> = ({ card, index, total }) => {
  const [styling, setStyling] = useState({translate: `0 calc(50cqh - ${CARD_HEIGHT / 2}px)`})
  useEffect(() => {
    setTimeout(() => {
      console.log(`animating ${index}/${total}`)
      if (total < 6) {
        const x = (CARD_WIDTH + GAP * 2) + (index * (CARD_WIDTH + GAP))
        setStyling({translate: `${x}px calc(50cqh - ${CARD_HEIGHT / 2}px)`})
      } else {
        const half = Math.floor(total / 2)
        if (index === (total - 1)) {

        } else {
          const x = (CARD_WIDTH + GAP * 2) + ((index % half) * (CARD_WIDTH + GAP))
          const y = index <= half ? `${GAP}px` : `${CARD_HEIGHT + 3 * GAP}px`
          setStyling({translate: `${x}px ${y}px`})
        }
      }
    }, (ANIMATION_DURATION_PER_CARD * 1000) * index)
  }, [setStyling])
  return <CardDiv style={styling}>{JSON.stringify(card, null, 2)}</CardDiv>
}

export const CardDisplay: React.FC<{cards: Card[]}> = ({cards}) => {
  return (
    <PlayMat cards={cards}>
      {cards.map((card, index) => {
        return (
          <CardWidget key={index} index={index} total={cards.length} card={card}/>
        )
      })}
    </PlayMat>
  )
}
