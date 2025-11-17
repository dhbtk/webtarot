import { useQuery } from '@tanstack/react-query'
import { useReadingIds } from '../backend/queries.ts'
import { ReadingTab } from './ReadingTab.tsx'
import styled from 'styled-components'

const Wrapper = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.25rem 0.25rem 0;
  border-bottom: 1px solid #e5e7eb;
  background: #fafafa;
`

export default function ReadingTabs() {
  const result = useQuery(useReadingIds())
  return (
    <Wrapper>
      {result.data?.map(id => <ReadingTab key={id} id={id} />)}
    </Wrapper>
  )
}
