import React from 'react';
import { flexRender, type ColumnDef } from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
  TableSkeleton,
} from '@ui/components/table';
import { cn } from '@/shared/utils';
import { useDataTable, type DataTableConfig } from '../hooks/useDataTable';
import { DataTablePagination } from './DataTablePagination';
import { DataTableToolbar } from './DataTableToolbar';
import { DataTableColumnHeader } from './DataTableColumnHeader';

export interface DataTableProps<TData> extends DataTableConfig<TData> {
  className?: string;
  
  // Loading states
  isLoading?: boolean;
  isError?: boolean;
  error?: Error;
  
  // Empty state
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateAction?: React.ReactNode;
  
  // Toolbar
  showToolbar?: boolean;
  toolbarActions?: React.ReactNode;
  searchPlaceholder?: string;
  
  // Table styling
  variant?: 'default' | 'bordered' | 'striped';
  size?: 'sm' | 'default' | 'lg';
  
  // Row styling
  getRowProps?: (row: any) => React.HTMLAttributes<HTMLTableRowElement>;
  onRowClick?: (row: any) => void;
  
  // Custom renderers
  renderSubRow?: (row: any) => React.ReactNode;
  
  // Selection
  showSelection?: boolean;
  selectionActions?: React.ReactNode;
}

export function DataTable<TData>({
  className,
  data,
  columns,
  isLoading = false,
  isError = false,
  error,
  emptyStateTitle = "No data found",
  emptyStateDescription = "No results match your current filters.",
  emptyStateAction,
  showToolbar = true,
  toolbarActions,
  searchPlaceholder = "Search...",
  variant = "default",
  size = "default",
  getRowProps,
  onRowClick,
  renderSubRow,
  showSelection = false,
  selectionActions,
  ...config
}: DataTableProps<TData>) {
  const {
    table,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    columnVisibility,
    setColumnVisibility,
    rowSelection,
    setRowSelection,
    globalFilter,
    setGlobalFilter,
    selectedRows,
    isAllRowsSelected,
    isSomeRowsSelected,
    resetFilters,
    resetSorting,
    resetSelection,
    resetAll,
    canPreviousPage,
    canNextPage,
    pageCount,
    pageIndex,
    pageSize,
    totalRows,
    getVisibleColumns,
    getHiddenColumns,
    toggleColumnVisibility,
  } = useDataTable({
    data,
    columns,
    enableRowSelection: showSelection,
    onRowClick,
    ...config,
  });

  // Handle loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {showToolbar && (
          <div className="h-10 bg-muted animate-pulse rounded" />
        )}
        <TableSkeleton rows={pageSize} columns={columns.length} />
      </div>
    );
  }

  // Handle error state
  if (isError) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="p-8 text-center">
          <div className="text-destructive text-sm font-medium">
            Error loading data
          </div>
          {error && (
            <div className="text-muted-foreground text-xs mt-1">
              {error.message}
            </div>
          )}
        </div>
      </div>
    );
  }

  const rows = table.getRowModel().rows;
  const hasData = rows.length > 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      {showToolbar && (
        <DataTableToolbar
          table={table}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          searchPlaceholder={searchPlaceholder}
          resetFilters={resetFilters}
          resetAll={resetAll}
          columnVisibility={columnVisibility}
          toggleColumnVisibility={toggleColumnVisibility}
          actions={toolbarActions}
          selectedRows={selectedRows}
          selectionActions={selectionActions}
          showSelection={showSelection}
        />
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table variant={variant} size={size}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} size={size}>
                    {header.isPlaceholder ? null : (
                      <DataTableColumnHeader
                        column={header.column}
                        title={
                          typeof header.column.columnDef.header === 'string'
                            ? header.column.columnDef.header
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )
                        }
                      />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          
          <TableBody>
            {hasData ? (
              rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    variant={onRowClick ? "clickable" : "default"}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => onRowClick?.(row)}
                    {...getRowProps?.(row)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} size={size}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  {/* Sub-row rendering */}
                  {renderSubRow && row.getIsExpanded() && (
                    <TableRow>
                      <TableCell colSpan={columns.length}>
                        {renderSubRow(row)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableEmpty 
                columns={columns.length}
                message={emptyStateTitle}
              >
                <div className="flex flex-col items-center justify-center space-y-4 py-8">
                  <div className="text-center">
                    <h3 className="text-lg font-medium">{emptyStateTitle}</h3>
                    <p className="text-muted-foreground mt-1">
                      {emptyStateDescription}
                    </p>
                  </div>
                  {emptyStateAction}
                </div>
              </TableEmpty>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {hasData && (
        <DataTablePagination
          table={table}
          canPreviousPage={canPreviousPage}
          canNextPage={canNextPage}
          pageCount={pageCount}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalRows={totalRows}
          pageSizeOptions={config.pageSizeOptions}
          selectedRows={selectedRows}
          showSelection={showSelection}
        />
      )}
    </div>
  );
}

// Create typed version for specific entity
export function createDataTable<TData>() {
  return DataTable as React.ComponentType<DataTableProps<TData>>;
}