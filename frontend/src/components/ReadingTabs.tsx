import { useQuery } from '@tanstack/react-query'
import { useReadingIds } from '../backend/queries.ts'
import { ReadingTab } from './ReadingTab.tsx'

export default function ReadingTabs() {
  const result = useQuery(useReadingIds())
  return (
    <div>
      {result.data?.map(id => <ReadingTab key={id} id={id} />)}
    </div>
  )
}
