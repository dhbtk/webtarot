import { createFileRoute, redirect } from '@tanstack/react-router'

// Root path: redirect to /readings
export const beforeLoad = () => {
  throw redirect({ to: '/readings' })
}

export default function IndexRedirect() {
  return null
}

export const Route = createFileRoute('/')({
  beforeLoad,
  component: IndexRedirect,
})
