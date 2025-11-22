import { createFileRoute } from '@tanstack/react-router'
import styled from 'styled-components'
import ReadingForm from '../../components/ReadingForm.tsx'

const Heading = styled.h2`
  margin: 0;
  text-align: center;
  font-weight: 500;
  font-size: 1.25rem;
`

export default function ReadingsIndex () {
  return (
    <div style={{ padding: '1rem' }}>
      <Heading>tire seu webtarot para saber seu webdestino</Heading>
      <div style={{ maxWidth: '400px', margin: '1rem auto' }}>
        <ReadingForm/>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/readings/')({
  component: ReadingsIndex
})
