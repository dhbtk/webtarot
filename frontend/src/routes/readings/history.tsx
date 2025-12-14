import { createFileRoute } from '@tanstack/react-router'
import { useInfiniteQuery } from '@tanstack/react-query'
import styled from 'styled-components'
import { getHistory } from '../../backend/api.ts'
import type { Interpretation } from '../../backend/models.ts'
import { interpretationReading } from '../../backend/models.ts'
import { ReadingListItem } from '../../components/reading/history/ReadingListItem.tsx'
import InfiniteScroll from 'react-infinite-scroll-component'
import { queryClient } from '../../queryClient.tsx'

export const Route = createFileRoute('/readings/history')({
  component: RouteComponent,
  onLeave: async () => {
    return await queryClient.invalidateQueries({ queryKey: ['history'] })
  },
})

const ScrollableContainer = styled.div`
  display: grid;
  overflow: auto;
  max-height: 100%;

  @media (min-width: 768px) {
    border-radius: 0.75rem;
  }
`

function ReadingList(props: { readingList: Interpretation[] }) {
  const readings = props.readingList
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {readings.map((r, i) => (
        <ReadingListItem index={i} key={interpretationReading(r).id} interpretation={r} />
      ))}
    </div>
  )
}

function RouteComponent() {
  const PAGE_SIZE = 5

  const query = useInfiniteQuery<Interpretation[], Error>({
    queryKey: ['history'],
    queryFn: async ({ pageParam }) => {
      console.log('pageParam', pageParam)
      const before = typeof pageParam === 'string' ? pageParam : undefined
      return getHistory({ before, limit: PAGE_SIZE })
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < PAGE_SIZE) return undefined
      const last = interpretationReading(lastPage[lastPage.length - 1])
      return last.createdAt
    },
  })

  const allData = query.data?.pages?.flat() ?? []

  return (
    <ScrollableContainer id="history_scrollable_container">
      <InfiniteScroll
        scrollableTarget="history_scrollable_container"
        dataLength={allData.length}
        next={() => !query.isFetching && query.fetchNextPage()}
        hasMore={query.hasNextPage}
        loader={<p>Loading...</p>}
        endMessage={<p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>— End —</p>}
      >
        <ReadingList readingList={allData} />
      </InfiniteScroll>
    </ScrollableContainer>
  )
}
