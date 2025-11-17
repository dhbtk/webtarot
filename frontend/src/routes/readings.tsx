import { createFileRoute, Outlet } from '@tanstack/react-router'
import ReadingForm from '../components/ReadingForm.tsx'
import React from 'react'
import ReadingTabs from '../components/ReadingTabs.tsx'

export const Route = createFileRoute('/readings')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 'calc(100vh - 57px)', flex: 1, width: '100%' }}>
      <aside
        style={{
          width: 320,
          maxWidth: '40vw',
          padding: '1rem',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>New Reading</h2>
        <ReadingForm />
      </aside>
      <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <ReadingTabs/>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Outlet />
        </div>
      </section>
    </div>
  )
}
