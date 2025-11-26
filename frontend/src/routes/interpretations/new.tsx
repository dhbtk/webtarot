import { createFileRoute } from '@tanstack/react-router'
import { FormWrapper } from '../../components/reading/form/form.tsx'
import InterpretationForm from '../../components/reading/form/InterpretationForm.tsx'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/interpretations/new')({
  component: RouteComponent,
})

function RouteComponent () {
  const { t } = useTranslation()
  return (
    <FormWrapper style={{ overflow: 'auto' }}>
      <h2>{t('reading.interpretation.title')}</h2>
      <InterpretationForm/>
    </FormWrapper>
  )
}
