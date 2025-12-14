import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getStats } from '../../backend/api.ts'
import type { ArcanaStats } from '../../backend/models.ts'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { arcanaLabel } from '../../util/cards.ts'
import styled from 'styled-components'
import { ReadingStats } from '../../components/reading/ReadingStats.tsx'
import { ReadingSubLayout } from '../../components/reading/layout/ReadingSubLayout.tsx'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/readings/stats')({
  component: RouteComponent,
})

const defaultArray: ArcanaStats[] = []

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  font-size: 85%;
  font-family: var(--font-sans-alt);

  thead,
  tbody {
    border-bottom: 2px solid var(--border-light);
  }

  .sortable {
    cursor: pointer;
    user-select: none;
  }

  th,
  td {
    padding: 0.5rem;
    text-align: right;
  }

  th:first-child,
  td:first-child {
    text-align: left;
  }

  th:not(:first-child),
  td:not(:first-child) {
    width: 1rem;
    white-space: nowrap;
  }
`

function RouteComponent() {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  })
  const data = query.data?.arcanaStats ?? defaultArray
  const columnHelper = createColumnHelper<ArcanaStats>()
  const columns = [
    columnHelper.accessor((row) => arcanaLabel(row.arcana), {
      cell: (info) => info.getValue(),
      header: t('stats.table.arcana'),
      id: 'arcanaName',
      footer: () => t('stats.footer.totalReadings', { count: query.data?.totalReadings ?? 0 }),
    }),
    columnHelper.accessor('totalCount', {
      header: t('stats.table.total'),
      footer: () => query.data?.totalCardsDrawn,
    }),
    columnHelper.accessor('drawnCount', {
      header: t('stats.table.uprightTotal'),
    }),
    columnHelper.accessor('drawnFlippedCount', {
      header: t('stats.table.reversedTotal'),
    }),
    columnHelper.accessor('percentTotal', {
      cell: (info) => `${(100 * info.getValue()).toFixed(2)}%`,
      header: t('stats.table.percent'),
    }),
    columnHelper.accessor('percentDrawn', {
      cell: (info) => `${(100 * info.getValue()).toFixed(2)}%`,
      header: t('stats.table.percentUpright'),
    }),
    columnHelper.accessor('percentFlipped', {
      cell: (info) => `${(100 * info.getValue()).toFixed(2)}%`,
      header: t('stats.table.percentReversed'),
    }),
  ]
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
  return (
    <ReadingSubLayout>
      <div style={{ padding: '1rem', height: '100%', overflow: 'auto', minWidth: 0 }}>
        {query.data && <ReadingStats stats={query.data} />}
        <StyledTable>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={header.column.getCanSort() ? 'sortable' : ''}
                        onClick={header.column.getToggleSortingHandler()}
                        title={
                          header.column.getCanSort()
                            ? header.column.getNextSortingOrder() === 'asc'
                              ? t('table.sort.asc')
                              : header.column.getNextSortingOrder() === 'desc'
                                ? t('table.sort.desc')
                                : t('table.sort.clear')
                            : undefined
                        }
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: t('table.ascending'),
                          desc: t('table.descending'),
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            {table.getFooterGroups().map((footerGroup) => (
              <tr key={footerGroup.id}>
                {footerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.footer, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </tfoot>
        </StyledTable>
      </div>
    </ReadingSubLayout>
  )
}
