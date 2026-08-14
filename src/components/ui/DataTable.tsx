import Link from 'next/link';
import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** When provided, the first column cell becomes a link to this href. */
  getRowHref?: (row: T) => string;
  ariaLabel: string;
  emptyLabel: string;
}

/**
 * Compact table layout of a listing (dual list view, decision D-5).
 * Style contract (design.md §1): uppercase 12px gray-500 header, 14px rows,
 * gray-100 dividers, pill badges retained, row link navigates to the entity.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  getRowHref,
  ariaLabel,
  emptyLabel,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <p className="rounded-card border border-gray-100 bg-white p-6 text-sm text-gray-500">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-gray-100 bg-white">
      <table aria-label={ariaLabel} className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 ${column.className ?? ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = getRowKey(row);
            return (
              <tr key={key} className="border-b border-gray-100 last:border-b-0 hover:bg-cream-50">
                {columns.map((column, index) => {
                  const content = column.render
                    ? column.render(row)
                    : String(row[column.key as keyof T] ?? '');
                  const isFirst = index === 0;
                  return (
                    <td key={column.key} className="px-4 py-3 text-gray-700">
                      {isFirst && getRowHref ? (
                        <Link
                          href={getRowHref(row)}
                          className="font-medium text-ink hover:underline"
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
