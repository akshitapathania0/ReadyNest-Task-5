import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  isLoading?: boolean;
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  isLoading,
  meta,
  onPageChange,
  onSearch,
  searchPlaceholder = 'Search...',
  filters,
  emptyMessage = 'No results found.',
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    manualPagination: !!meta,
    pageCount: meta?.totalPages ?? 1,
  });

  const handleSearch = (val: string) => {
    setGlobalFilter(val);
    onSearch?.(val);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {(onSearch || filters) && (
        <div className="flex gap-2 flex-wrap items-center">
          {onSearch && (
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">⌕</span>
              <input
                value={globalFilter}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-[var(--surface-1)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-[var(--border-accent)] transition-colors"
              />
            </div>
          )}
          {filters}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm border-collapse">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-[var(--border)]">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={`
                      text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide
                      ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-[var(--text-primary)]' : ''}
                    `}
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && ' ↑'}
                      {header.column.getIsSorted() === 'desc' && ' ↓'}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0">
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-[var(--surface-0)] rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-[var(--text-muted)]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-0)] transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-[var(--text-secondary)]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">
            {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(meta.page - 1)}
              disabled={!meta.hasPrev}
              className="px-2 py-1 rounded border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--surface-0)] transition-colors"
            >
              ‹
            </button>
            {[...Array(Math.min(meta.totalPages, 7))].map((_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => onPageChange?.(page)}
                  className={`
                    w-7 h-7 rounded text-xs border transition-colors
                    ${page === meta.page
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-[var(--border)] hover:bg-[var(--surface-0)]'
                    }
                  `}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange?.(meta.page + 1)}
              disabled={!meta.hasNext}
              className="px-2 py-1 rounded border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--surface-0)] transition-colors"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
