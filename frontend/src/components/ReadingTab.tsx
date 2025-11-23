import { Link, useNavigate } from '@tanstack/react-router'
import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useReadingById } from '../backend/queries.ts'
import styled from 'styled-components'
import { getSavedReadings, removeReading } from '../backend/savedReadings.ts'

export const TabLink = styled(Link)`
  font-family: "Varta", system-ui, sans-serif;
  font-weight: 500;
  padding: 0.12rem 0.5rem;
  border: 1px solid transparent;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.75rem;
  border-radius: 6px;
  max-width: max(150px, 15vw);
  display: flex;
  align-items: center;

  &.active {
    border: 1px solid #7e50f8;
    background: rgba(120, 55, 248, 0.3);
  }

  &:hover {
    color: inherit;

    &:not(.active) {
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.1);
    }

    button {
      visibility: visible;
    }
  }

  span {
    flex: 1;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    margin-bottom: -2px;
  }

  button {
    font-family: "Montserrat", sans-serif;
    border: none;
    outline: none;
    margin: 0 0 0 0.12rem;
    padding: 0 0.25rem;
    background: none;
    color: inherit;
    font-size: 1rem;
    visibility: hidden;
    line-height: 1;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    @media (max-width: 768px) {
      visibility: visible;
    }
  }
`

export const ReadingTab: React.FC<{ id: string }> = ({ id }: { id: string }) => {
  const result = useQuery(useReadingById(id))
  const title = result.data?.reading?.question ?? ''

  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const removeMutation = useMutation({
    mutationFn: () => {
      const currentIndex = getSavedReadings().indexOf(id)
      removeReading(id)
      const nextId = getSavedReadings()[currentIndex] ?? null
      if (nextId !== null) {
        return Promise.resolve(nextId)
      }
      const prevId = getSavedReadings()[currentIndex - 1] ?? null
      if (prevId !== null) {
        return Promise.resolve(prevId)
      }
      return Promise.resolve(null)
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ['readings'] })
      if (id !== null) {
        await navigate({ to: `/readings/${id}` })
      } else {
        await navigate({ to: '/readings' })
      }
    }
  })

  return (
    <TabLink to={`/readings/${id}`} activeProps={{ className: 'active' }} title={title}>
      <span>{title}</span>
      <button type="button" onClick={(e) => {
        e.preventDefault()
        if (confirm('Tem certeza que deseja excluir esta tiragem?')) {
          removeMutation.mutate()
        }
      }}>
        &times;
      </button>
    </TabLink>
  )
}
