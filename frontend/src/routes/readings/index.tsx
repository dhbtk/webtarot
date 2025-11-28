import { createFileRoute } from '@tanstack/react-router'
import styled from 'styled-components'
import ReadingForm from '../../components/reading/form/ReadingForm.tsx'
import { FormWrapper } from '../../components/reading/form/form.tsx'
import { Footer } from '../../components/layout/Footer.tsx'
import { useTranslation } from 'react-i18next'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
`

export const Heading = styled.h2`
  margin: 0;
  text-align: center;
  font-weight: 400;
  font-size: var(--fs-xl);
  opacity: 0;
  animation: fade-in var(--anim-duration) var(--anim-function) forwards;
  animation-delay: calc(var(--anim-duration));
  text-shadow: 1px 2px 2px rgb(var(--black-rgb) / 0.8);

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  &:nth-of-type(2) {
    animation-delay: calc(var(--anim-duration) * 1.75);
  }
`
export default function ReadingsIndex () {
  // const result = useQuery(useReadingIds())
  const { t } = useTranslation()

  return (
    <Wrapper>
      {/*<Section style={{ flex: 'none', display: result.data?.length ? 'flex' : 'none' }}>*/}
      {/*  <ReadingTabs/>*/}
      {/*</Section>*/}
      <Heading>{t('hero.tagline1')}</Heading>
      <Heading>{t('hero.tagline2')}</Heading>
      <FormWrapper>
        <ReadingForm/>
      </FormWrapper>
      <Footer/>
    </Wrapper>
  )
}

export const Route = createFileRoute('/readings/')({
  component: ReadingsIndex
})
