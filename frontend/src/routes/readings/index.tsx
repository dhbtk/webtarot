import { createFileRoute } from '@tanstack/react-router'

export default function ReadingsIndex() {
  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ marginTop: 0 }}>Welcome</h2>
      <p style={{ color: '#374151' }}>
        Use the form on the left to create a new reading. Your reading will open here with
        its question, drawn cards, and interpretation.
      </p>
    </div>
  )
}

export const Route = createFileRoute('/readings/')({
  component: ReadingsIndex
})
