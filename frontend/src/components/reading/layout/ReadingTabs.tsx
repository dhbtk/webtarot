import { useQuery } from '@tanstack/react-query'
import { useReadingIds } from '../../../backend/queries.ts'
import { ReadingTab } from './ReadingTab.tsx'
import styled from 'styled-components'

const Wrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding-bottom: calc(0.5rem - 2px);
  border-bottom: 1px solid rgb(var(--white-rgb) / 0.35);
`

export default function ReadingTabs() {
  const result = useQuery(useReadingIds())
  return (
    <Wrapper style={{ display: result.data?.length ? 'flex' : 'none' }}>
      {result.data?.map((id) => (
        <ReadingTab key={id} id={id} />
      ))}
    </Wrapper>
  )
}
