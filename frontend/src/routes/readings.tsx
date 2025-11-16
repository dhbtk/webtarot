import { createFileRoute, Outlet } from '@tanstack/react-router'
import ReadingForm from '../components/ReadingForm.tsx'
import React from 'react'

export const Route = createFileRoute('/readings')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 'calc(100vh - 57px)' }}>
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
        <div
          style={{
            borderBottom: '1px solid #e5e7eb',
            padding: '0.5rem 1rem',
            background: '#fafafa',
            fontSize: 13,
            color: '#6b7280',
          }}
        >
          {/* Placeholder for a tabbed view of all readings */}
          Tabs: (coming soon)
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Outlet />
        </div>
      </section>
    </div>
  )
}
