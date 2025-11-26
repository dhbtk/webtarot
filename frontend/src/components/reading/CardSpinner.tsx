import styled from 'styled-components'
import { CARD_HEIGHT, CARD_WIDTH, CardBack, CardDiv, CardImage } from './CardDisplay.tsx'
import { getAllArcana } from '../../backend/models.ts'
import { useState } from 'react'
import { arcanaImage } from '../../util/cards.ts'

const CardSpinnerContainer = styled.div`
  display: flex;
  padding: 1rem;
  perspective: 1000px;
  container-type: inline-size;
`

const SmallerCardDiv = styled(CardDiv)`
  width: ${CARD_WIDTH / 1.5}px;
  height: ${CARD_HEIGHT / 1.5}px;
  position: unset;
  transform-origin: center;
  animation: card-rotate calc((var(--anim-duration) / 2) * 5) infinite var(--anim-function),
  slide calc((var(--anim-duration) / 2) * 4) infinite alternate var(--anim-function);

  @keyframes card-rotate {
    0% {
      transform: rotateY(0deg);
    }
    100% {
      transform: rotateY(1080deg);
    }
  }

  @keyframes slide {
    0% {
      translate: 0 0;
    }
    100% {
      translate: calc(100cqw - 100%) 0;
    }
  }
`

const allArcana = getAllArcana()

export const CardSpinner = () => {
  const [arcana, _setArcana] = useState(allArcana[Math.floor(Math.random() * allArcana.length)])

  return (
    <CardSpinnerContainer>
      <SmallerCardDiv>
        <CardImage style={{ backgroundImage: `url(${arcanaImage(arcana)})` }}/>
        <CardBack/>
      </SmallerCardDiv>
    </CardSpinnerContainer>
  )
}
