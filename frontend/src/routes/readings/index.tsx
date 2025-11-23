import { createFileRoute } from '@tanstack/react-router'
import styled from 'styled-components'
import ReadingForm from '../../components/reading/form/ReadingForm.tsx'
import { Section } from '../../components/reading/layout/ReadingSubLayout.tsx'
import ReadingTabs from '../../components/reading/layout/ReadingTabs.tsx'
import { useQuery } from '@tanstack/react-query'
import { useReadingIds } from '../../backend/queries.ts'
import { FormWrapper, Heading } from '../../components/reading/form/form.tsx'

function ReadingIndexForm () {
  return (
    <>
      <Heading>tire seu webtarot descubra seu webdestino</Heading>
      <FormWrapper>
        <ReadingForm/>
      </FormWrapper>
    </>
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
