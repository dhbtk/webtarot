import { Link } from '@tanstack/react-router'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReadingById } from '../backend/queries.ts'
import styled from 'styled-components'

export const TabLink = styled(Link)`
  padding: 0.25rem 0.5rem;
  border: 1px solid #e5e7eb;
  border-bottom: none;
  color: #6b7280;
  font-size: 12px;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  max-width: max(150px, 15vw);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  
  &.active {
    background: #f3f4f6;
  }
  &:hover {
    color: inherit;
  }
  
  @media (prefers-color-scheme: dark) {
    background: #1f2937;
    border-color: #374151;
    
    &.active {
      background: #2d3748;
    }
    
    &:hover {
      color: #e5e7eb;
    }
  }
`

export const ReadingTab: React.FC<{ id: string }> = ( { id }: { id: string }) => {
  const result = useQuery(useReadingById(id))
  const title = result.data?.reading?.question ?? ''
  return (
    <TabLink to={`/readings/${id}`} activeProps={{className: 'active'}} title={title}>{title}</TabLink>
  )
}
