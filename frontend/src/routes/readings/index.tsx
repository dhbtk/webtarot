import { createFileRoute } from '@tanstack/react-router'
import styled from 'styled-components'
import ReadingForm from '../../components/ReadingForm.tsx'
import { Section } from '../../components/ReadingSubLayout.tsx'
import ReadingTabs from '../../components/ReadingTabs.tsx'
import { useQuery } from '@tanstack/react-query'
import { useReadingIds } from '../../backend/queries.ts'

const Heading = styled.h2`
  margin: 0;
  text-align: center;
  font-weight: 500;
  font-size: 1.25rem;
`

const FormWrapper = styled.div`
  background-color: rgba(251, 131, 207, 0.4);
  padding: 1.5rem;
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 500px;
  margin: 0 auto;
  box-shadow: 0.5rem 0.5rem 0.75rem 0 rgba(0, 0, 0, 0.25);
  animation: slide-from-bottom 0.5s ease-out forwards;
`

function ReadingIndexForm () {
  return (
    <FormWrapper>
      <Heading>tire seu webtarot para saber seu webdestino</Heading>
      <ReadingForm/>
    </FormWrapper>
  )
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
`

export default function ReadingsIndex () {
  const result = useQuery(useReadingIds())

  return (
    <Wrapper>
      <Section style={{ flex: 'none', display: result.data?.length ? 'flex' : 'none' }}>
        <ReadingTabs/>
      </Section>
      <ReadingIndexForm/>
    </Wrapper>
  )
}

export const Route = createFileRoute('/readings/')({
  component: ReadingsIndex
})
