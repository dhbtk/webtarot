import { createFileRoute } from '@tanstack/react-router'

export default function ReadingsIndex() {
  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ marginTop: 0, textAlign: 'center' }}>Boas-vindas</h2>
      <p style={{ color: '#374151', textAlign: 'center' }}>
        Use o formulário acima para criar uma nova pergunta e receber uma tiragem e interpretação.
      </p>
    </div>
  )
}

export const Route = createFileRoute('/readings/')({
  component: ReadingsIndex
})
