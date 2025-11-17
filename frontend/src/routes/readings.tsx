import { createFileRoute, Outlet } from '@tanstack/react-router'
import ReadingForm from '../components/ReadingForm.tsx'
import ReadingTabs from '../components/ReadingTabs.tsx'
import styled from 'styled-components'

export const Route = createFileRoute('/readings')({
  component: RouteComponent,
})

const Wrapper = styled.div`
  display: flex;
  height: 100%;
  min-height: calc(100vh - 57px);
  flex: 1;
  width: 100%;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`

const FormWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  
  @media (min-width: 768px) {
    width: 320px;
    max-width: 40vw;
  }
`

function RouteComponent() {
  return (
    <Wrapper>
      <FormWrapper>
        <h2 style={{ margin: 0, fontSize: 16 }}>Nova Tiragem</h2>
        <ReadingForm />
      </FormWrapper>
      <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <ReadingTabs/>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Outlet />
        </div>
      </section>
    </Wrapper>
  )
}
