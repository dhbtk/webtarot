import styled from 'styled-components'
import type { Stats } from '../../backend/models.ts'
import React from 'react'
import { arcanaImage, arcanaLabel } from '../../util/cards.ts'
import { useTranslation } from 'react-i18next'

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
  background-color: rgb(var(--soft-pink-rgb) / 0.6);
  opacity: 0;
  animation: slide-from-top var(--anim-duration) var(--anim-function) forwards;
  animation-delay: calc(var(--anim-duration));
`

const BigStatValue = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-xxl);
`

const StatLabel = styled.div`
  padding-top: 1rem;
  padding-bottom: 0.25rem;
  font-size: var(--fs-base);
  text-align: center;
  font-family: var(--font-sans-alt);
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
  const { t } = useTranslation()
  return (
    <>
      <WrapperDiv>
        <StatDiv>
          <BigStatValue>{stats.totalReadings}</BigStatValue>
          <StatLabel>{t('stats.readings')}</StatLabel>
        </StatDiv>
        <StatDiv style={{ animationDelay: 'calc(var(--anim-duration) + 0.25s)' }}>
          <BigStatValue>{stats.totalCardsDrawn}</BigStatValue>
          <StatLabel>{t('stats.totalCards')}</StatLabel>
        </StatDiv>
        <StatDiv style={{ animationDelay: 'calc(var(--anim-duration) + 0.5s)' }}>
          <BigStatValue>{stats.neverDrawn.length}</BigStatValue>
          <StatLabel>{t('stats.neverDrawn')}</StatLabel>
        </StatDiv>
      </WrapperDiv>
      <NeverDrawnGallery>
        {stats.neverDrawn.map((arcana, i) => <img key={i} src={arcanaImage(arcana)} alt={arcanaLabel(arcana)}/>)}
      </NeverDrawnGallery>
    </>
  )
}
