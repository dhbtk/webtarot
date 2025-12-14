import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useReadingById } from '../../../backend/queries.ts'
import styled from 'styled-components'
import { getSavedReadings, removeReading } from '../../../backend/savedReadings.ts'
import { CloseOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

export const TabLink = styled(Link)`
  font-family: var(--font-sans-alt);
  font-weight: 500;
  padding: 0.12rem 0.5rem;
  border: 1px solid transparent;
  color: rgb(var(--white-rgb) / 0.75);
  font-size: var(--fs-xs);
  border-radius: 6px;
  max-width: max(150px, 15vw);
  display: flex;
  align-items: center;

  &.active {
    border: 1px solid var(--brand-purple);
    background: rgb(120 55 248 / 0.3);
  }

  &:hover {
    color: inherit;

    &:not(.active) {
      border: 1px solid rgb(var(--white-rgb) / 0.1);
      background: rgb(var(--white-rgb) / 0.1);
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
    font-family: var(--font-sans);
    border: none;
    outline: none;
    margin: 0 0 0 0.12rem;
    padding: 0.25rem;
    border-radius: 0.25rem;
    background: none;
    color: inherit;
    font-size: 0.5rem;
    visibility: hidden;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: rgb(var(--white-rgb) / 0.1);
    }

    @media (max-width: 768px) {
      visibility: visible;
    }

    svg {
      margin-top: -1px;
    }
  }
`

export const ReadingTab: React.FC<{ id: string }> = ({ id }: { id: string }) => {
  const { t } = useTranslation()
  const result = useQuery(useReadingById(id))
  const title = result.data?.reading?.question ?? ''
  const currentLocation = useLocation()

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
    onSuccess: async (nextId) => {
      await queryClient.invalidateQueries({ queryKey: ['readings'] })
      if (currentLocation.pathname === `/readings/${id}`) {
        if (nextId !== null) {
          await navigate({ to: `/readings/${nextId}` })
        } else {
          await navigate({ to: '/readings' })
        }
      }
    },
  })

  return (
    <TabLink to={`/readings/${id}`} activeProps={{ className: 'active' }} title={title}>
      <span>{title}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          if (confirm(t('history.delete.confirm'))) {
            removeMutation.mutate()
          }
        }}
      >
        <CloseOutlined />
      </button>
    </TabLink>
  )
}
