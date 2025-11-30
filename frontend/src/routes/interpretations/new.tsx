import { createFileRoute } from '@tanstack/react-router'
import { FormWrapper } from '../../components/reading/form/form.tsx'
import InterpretationForm from '../../components/reading/form/InterpretationForm.tsx'
import { useTranslation } from 'react-i18next'
import { Footer } from '../../components/layout/Footer.tsx'
import styled from 'styled-components'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
`
export const Route = createFileRoute('/interpretations/new')({
  component: RouteComponent,
})

function RouteComponent () {
  const { t } = useTranslation()
  return (
    <Wrapper>
      <FormWrapper style={{ overflow: 'auto', flex: 1 }}>
        <h2>{t('reading.interpretation.title')}</h2>
        <InterpretationForm/>
      </FormWrapper>
      <Footer/>
    </Wrapper>
  )
}
