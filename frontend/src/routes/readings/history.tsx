import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import styled from 'styled-components'
import { deleteInterpretation, getHistory } from '../../backend/api.ts'
import type { Reading } from '../../backend/models.ts'
import { interpretationReading } from '../../backend/models.ts'
import { removeReading } from '../../backend/savedReadings.ts'
import { cardLabel } from '../../util/cards.ts'
import { ReadingSubLayout } from '../../components/ReadingSubLayout.tsx'

export const Route = createFileRoute('/readings/history')({
  component: RouteComponent,
})

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  font-size: 85%;
  font-family: "Varta", system-ui, sans-serif;

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

const defaultArray: Reading[] = []

function RouteComponent () {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['history'],
    queryFn: async () => getHistory().then(it => it.map(interpretationReading)),
  })

  const readings: Reading[] = (query.data ?? defaultArray)

  const columnHelper = createColumnHelper<Reading>()
  const columns = [
    columnHelper.accessor('question', {
      header: 'Pergunta',
      cell: props => <Link to={`/readings/${props.row.original.id}`}>{props.row.original.question}</Link>
    }),
    columnHelper.accessor(row => row.cards.map(cardLabel).join(', '), {
      id: 'cardsList',
      header: 'Cartas',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Data',
      cell: info => formatDate(info.getValue()),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Ações',
      cell: (props) => <DeleteButton id={props.row.original.id} onDeleted={async (id) => {
        removeReading(id)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['history'] }),
          queryClient.invalidateQueries({ queryKey: ['readings'] }),
          queryClient.invalidateQueries({ queryKey: ['readings', id] }),
        ])
      }}/>,
    }),
  ]

  const table = useReactTable({
    columns,
    data: readings,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <ReadingSubLayout>
      <div style={{ padding: '1rem', height: '100%', overflow: 'auto', minWidth: 0 }}>
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
    </ReadingSubLayout>
  )
}

function DeleteButton ({ id, onDeleted }: { id: string, onDeleted: (id: string) => Promise<void> | void }) {
  const mutation = useMutation({
    mutationFn: async () => {
      await deleteInterpretation(id)
      return id
    },
    onSuccess: async (deletedId) => {
      await onDeleted(deletedId)
    },
  })
  return (
    <button
      onClick={() => {
        if (confirm('Tem certeza que deseja excluir esta tiragem?')) {
          mutation.mutate()
        }
      }}
      disabled={mutation.isPending}
      title={mutation.isPending ? 'Deleting...' : 'Delete this interpretation'}
      style={{
        fontSize: '0.75rem',
        padding: '0.25rem 0.5rem',
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.3)',
        color: 'inherit',
        borderRadius: 4,
        cursor: mutation.isPending ? 'default' : 'pointer',
      }}
    >
      {mutation.isPending ? 'Excluindo…' : 'Excluir'}
    </button>
  )
}
