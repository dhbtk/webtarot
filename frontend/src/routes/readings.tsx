import { createFileRoute, MatchRoute, Outlet } from '@tanstack/react-router'
import ReadingForm from '../components/reading/form/ReadingForm.tsx'
import styled from 'styled-components'
import useWindowDimensions from '../util/useWindowDimensions.ts'
import { useTranslation } from 'react-i18next'
import { Footer } from '../components/layout/Footer.tsx'

export const Route = createFileRoute('/readings')({
  component: RouteComponent,
})

const Wrapper = styled.div`
  display: flex;
  height: 100%;
  flex: 1;
  width: 100%;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`

const FormWrapper = styled.div`
  background-color: rgb(var(--panel-purple-rgb) / 0.7);
  padding: 1.5rem;
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0.5rem 0.5rem 0.75rem 0 rgba(0, 0, 0, 0.25);
  animation: slide-from-left var(--anim-duration) var(--anim-function) forwards;
  flex-shrink: 0;

  @media (min-width: 768px) {
    width: 320px;
    max-width: 40vw;
  }

  h2 {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 500;
  }
`

function RouteComponent () {
  const { width } = useWindowDimensions()
  const { t } = useTranslation()
  const showFormWrapper = width > 768
  return (
    <Wrapper>
      {showFormWrapper && (
        <MatchRoute to="/readings">
          {(match) => !match && (
            <FormWrapper>
              <h2>{t('reading.new.title')}</h2>
              <ReadingForm/>
              <Footer minimal/>
            </FormWrapper>
          )}
        </MatchRoute>
      )}
      <Outlet/>
    </Wrapper>
  )
}
