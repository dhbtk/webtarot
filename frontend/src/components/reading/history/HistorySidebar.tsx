import styled from 'styled-components'
import { Link } from '@tanstack/react-router'
import React from 'react'
import { type Interpretation, interpretationReading } from '../../../backend/models.ts'
import { useTranslation } from 'react-i18next'
import { useInfiniteQuery } from '@tanstack/react-query'
import { getHistory } from '../../../backend/api.ts'
import InfiniteScroll from 'react-infinite-scroll-component'

const SidebarList = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
  width: calc(100% + 3rem);
  margin-left: -1.5rem;
  margin-bottom: 0.5rem;
`

const ListItem = styled(Link)`
  display: flex;
  flex-direction: column;
  padding: 0.25rem 0.75rem;
  background: linear-gradient(to bottom, rgb(var(--white-rgb) / 0.05), transparent);
  border-bottom: 1px solid rgb(var(--white-rgb) / 0.2);
  animation: slide-from-left var(--anim-duration) var(--anim-function) forwards;
  opacity: 0;

  h4 {
    margin: 0;
    padding: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
    font-size: var(--fs-sm);
    color: rgb(var(--white-rgb) / 0.7);
  }

  small {
    margin: 0;
    padding-left: 0.25rem;
    font-size: var(--fs-xs);
    color: rgb(var(--white-rgb) / 0.5);
  }

  &:hover,
  &.active {
    background: linear-gradient(
      to bottom,
      rgb(var(--white-rgb) / 0.1),
      rgb(var(--white-rgb) / 0.05)
    );
    h4 {
      color: rgb(var(--white-rgb) / 0.8);
    }
    small {
      color: rgb(var(--white-rgb) / 0.6);
    }
  }

  &.active {
    background: linear-gradient(
      to bottom,
      rgb(var(--white-rgb) / 0.15),
      rgb(var(--white-rgb) / 0.1)
    );
  }
`

const HistoryListItem: React.FC<{ interpretation: Interpretation; index: number }> = ({
  interpretation,
  index,
}) => {
  const { t } = useTranslation()
  const reading = interpretationReading(interpretation)
  return (
    <ListItem
      as={Link}
      to={`/readings/${reading.id}`}
      style={{ animationDelay: `${0.1 * (index % 10)}s` }}
    >
      <h4>{reading.question}</h4>
      <small>
        {t('reading.list.askedAt', { date: new Date(reading.createdAt).toLocaleString() })}
      </small>
    </ListItem>
  )
}

export default function HistorySidebar() {
  const PAGE_SIZE = 10

  const query = useInfiniteQuery<Interpretation[], Error>({
    queryKey: ['history'],
    queryFn: async ({ pageParam }) => {
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
    <SidebarList id="history_sidebar_list">
      <InfiniteScroll
        scrollableTarget="history_sidebar_list"
        dataLength={allData.length}
        next={async () => {
          if (!query.isFetching) {
            await query.fetchNextPage()
          }
        }}
        hasMore={query.hasNextPage}
        loader={<p>Loading...</p>}
        endMessage={<p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>— End —</p>}
      >
        {allData.map((item, i) => (
          <HistoryListItem index={i} key={i} interpretation={item}></HistoryListItem>
        ))}
      </InfiniteScroll>
    </SidebarList>
  )
}
