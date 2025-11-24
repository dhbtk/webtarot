import { createFileRoute } from '@tanstack/react-router'
import { FormWrapper } from '../../components/reading/form/form.tsx'
import InterpretationForm from '../../components/reading/form/InterpretationForm.tsx'

export const Route = createFileRoute('/interpretations/new')({
  component: RouteComponent,
})

function RouteComponent () {
  return (
    <FormWrapper style={{ overflow: 'auto' }}>
      <h2>Interpretar Tiragem</h2>
      <InterpretationForm/>
    </FormWrapper>
  )
}
