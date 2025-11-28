import { createFileRoute, redirect } from '@tanstack/react-router'

const beforeLoad = () => {
  throw redirect({ to: '/readings' })
}

function IndexRedirect () {
  return null
}

export const Route = createFileRoute('/')({
  beforeLoad,
  component: IndexRedirect,
})
