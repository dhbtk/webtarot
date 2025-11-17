import { Link } from '@tanstack/react-router'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReadingById } from '../backend/queries.ts'

export const ReadingTab: React.FC<{ id: string }> = ( { id }: { id: string }) => {
  const result = useQuery(useReadingById(id))
  return (
    <Link to={`/readings/${id}`}>{result.data?.reading?.question ?? ''}</Link>
  )
}
