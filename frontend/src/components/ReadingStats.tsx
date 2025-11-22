import styled from 'styled-components'
import type { Stats } from '../backend/models.ts'
import React from 'react'
import { arcanaImage, arcanaLabel } from '../util/cards.ts'

const WrapperDiv = styled.div`
  display: flex;
`

const StatDiv = styled.div`
  flex: 1;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
`

const BigStatValue = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
`

const StatLabel = styled.div`
  padding-top: 1rem;
  padding-bottom: 0.25rem;
  font-size: 0.8rem;
  text-align: center;
`

const NeverDrawnGallery = styled.div`
  display: flex;
  max-width: 30vw;
  overflow-x: auto;
  gap: 0.5rem;

  img {
    width: 100px;
  }
`

export const ReadingStats: React.FC<{ stats: Stats }> = ({ stats }) => {
  return (
    <>
      <WrapperDiv>
        <StatDiv>
          <BigStatValue>{stats.totalReadings}</BigStatValue>
          <StatLabel>Tiragens</StatLabel>
        </StatDiv>
        <StatDiv>
          <BigStatValue>{stats.totalCardsDrawn}</BigStatValue>
          <StatLabel>Total de cartas</StatLabel>
        </StatDiv>
        <StatDiv>
          <BigStatValue>{stats.neverDrawn.length}</BigStatValue>
          <StatLabel>Arcanos que nunca saíram</StatLabel>
        </StatDiv>
      </WrapperDiv>
      <NeverDrawnGallery>
        {stats.neverDrawn.map((arcana, i) => <img key={i} src={arcanaImage(arcana)} alt={arcanaLabel(arcana)}/>)}
      </NeverDrawnGallery>
    </>
  )
}
