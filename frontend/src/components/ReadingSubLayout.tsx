import React from 'react'
import styled from 'styled-components'
import ReadingTabs from './ReadingTabs.tsx'

export const Section = styled.section`
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: rgba(82, 69, 150, 0.7);
  padding: 1rem;
  border-radius: 0.75rem;
  box-shadow: 0.5rem 0.5rem 0.75rem 0 rgba(0, 0, 0, 0.25);
  animation: slide-from-right 0.5s ease-out forwards;
`

export const ReadingSubLayout: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <Section>
    <ReadingTabs/>
    <div style={{ flex: 1, minHeight: 0, maxHeight: '100%', overflowY: 'auto' }}>
      {children}
    </div>
  </Section>
)
