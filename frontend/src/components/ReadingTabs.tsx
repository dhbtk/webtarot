import { useQuery } from '@tanstack/react-query'
import { useReadingIds } from '../backend/queries.ts'
import { ReadingTab, TabLink } from './ReadingTab.tsx'
import styled from 'styled-components'

const Wrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.25rem 0.25rem 0;
  border-bottom: 1px solid #e5e7eb;
  background: #fafafa;
  
  @media (prefers-color-scheme: dark) {
    background: #1f2937;
    border-color: #374151;
  }
`

export default function ReadingTabs() {
  const result = useQuery(useReadingIds())
  return (
    <Wrapper>
      {result.data?.map(id => <ReadingTab key={id} id={id} />)}
      <TabLink to="/readings/stats" style={{ marginLeft: 'auto' }}>Stats</TabLink>
    </Wrapper>
  )
}
