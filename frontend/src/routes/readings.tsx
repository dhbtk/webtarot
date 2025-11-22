import { createFileRoute, MatchRoute, Outlet } from '@tanstack/react-router'
import ReadingForm from '../components/ReadingForm.tsx'
import ReadingTabs from '../components/ReadingTabs.tsx'
import styled from 'styled-components'
import useWindowDimensions from '../util/useWindowDimensions.ts'

export const Route = createFileRoute('/readings')({
  component: RouteComponent,
})

const Wrapper = styled.div`
  display: flex;
  height: 100%;
  flex: 1;
  width: 100%;
  gap: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`

const FormWrapper = styled.div`
  background-color: rgba(82, 69, 150, 0.7);
  padding: 1.5rem;
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (min-width: 768px) {
    width: 320px;
    max-width: 40vw;
  }

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 500;
  }
`

const Section = styled.section`
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: rgba(82, 69, 150, 0.7);
  padding: 1rem;
  border-radius: 0.75rem;
`

function RouteComponent () {
  const { width } = useWindowDimensions()
  const showFormWrapper = width > 768
  return (
    <Wrapper>
      {showFormWrapper && (
        <MatchRoute to="/readings">
          {(match) => !match && (
            <FormWrapper>
              <h2>Nova Tiragem</h2>
              <ReadingForm/>
            </FormWrapper>
          )}
        </MatchRoute>
      )}
      <Section>
        <ReadingTabs/>
        <div style={{ flex: 1, minHeight: 0, maxHeight: '100%', overflowY: 'auto' }}>
          <Outlet/>
        </div>
      </Section>
    </Wrapper>
  )
}
