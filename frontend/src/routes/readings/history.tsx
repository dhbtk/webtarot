import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import styled from 'styled-components'
import { getHistory } from '../../backend/api.ts'
import type { Interpretation, Reading } from '../../backend/models.ts'
import { interpretationReading } from '../../backend/models.ts'
import { cardLabel } from '../../util/cards.ts'

export const Route = createFileRoute('/readings/history')({
  component: RouteComponent,
})

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  font-size: 75%;

  thead, tbody {
    border-bottom: 2px solid #ddd;
  }

  .sortable {
    cursor: pointer;
    user-select: none;
  }

  th, td {
    padding: 0.5rem;
    text-align: left;
    vertical-align: top;
  }

  th:nth-child(3), td:nth-child(3) {
    white-space: nowrap;
    text-align: right;
  }

  a {
    color: inherit;
    text-decoration: underline;
  }
`

function formatDate (iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString()
  } catch {
    return iso
  }
}

const defaultArray: Interpretation[] = []

function RouteComponent () {
  const query = useQuery({
    queryKey: ['history'],
    queryFn: getHistory,
  })

  const readings: Reading[] = (query.data ?? defaultArray).map(interpretationReading)

  const columnHelper = createColumnHelper<Reading>()
  const columns = [
    columnHelper.display({
      id: 'question',
      header: 'Question',
      cell: props => <Link to={`/readings/${props.row.original.id}`}>{props.row.original.question}</Link>
    }),
    columnHelper.accessor(row => row.cards.map(cardLabel).join(', '), {
      id: 'cardsList',
      header: 'Cards list',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created_at',
      cell: info => formatDate(info.getValue()),
    }),
  ]

  const table = useReactTable({
    columns,
    data: readings,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return <div style={{ padding: '1rem', height: '100%', overflow: 'auto', minWidth: 0 }}>
    <StyledTable>
      <thead>
      {table.getHeaderGroups().map(headerGroup => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map(header => (
            <th key={header.id}>
              {header.isPlaceholder ? null : (
                <div
                  className={header.column.getCanSort() ? 'sortable' : ''}
                  onClick={header.column.getToggleSortingHandler()}
                  title={
                    header.column.getCanSort()
                      ? header.column.getNextSortingOrder() === 'asc'
                        ? 'Sort ascending'
                        : header.column.getNextSortingOrder() === 'desc'
                          ? 'Sort descending'
                          : 'Clear sort'
                      : undefined
                  }
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{
                    asc: ' 🔼',
                    desc: ' 🔽',
                  }[header.column.getIsSorted() as string] ?? null}
                </div>
              )}
            </th>
          ))}
        </tr>
      ))}
      </thead>
      <tbody>
      {table.getRowModel().rows.map(row => (
        <tr key={row.id}>
          {row.getVisibleCells().map(cell => (
            <td key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
      ))}
      </tbody>
    </StyledTable>
  </div>
}
