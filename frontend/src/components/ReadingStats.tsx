import styled from 'styled-components'
import type { Stats } from '../backend/models.ts'
import React from 'react'
import { arcanaImage, arcanaLabel } from '../util/cards.ts'

const WrapperDiv = styled.div`
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
`

const StatDiv = styled.div`
  flex: 1;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  box-shadow: 0.5rem 0.5rem 0.75rem 0 rgba(0, 0, 0, 0.25);
  border-radius: 0.75rem;
  background-color: rgba(251, 131, 207, 0.6);
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
  font-size: 1rem;
  text-align: center;
  font-family: "Varta", system-ui, sans-serif;
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
