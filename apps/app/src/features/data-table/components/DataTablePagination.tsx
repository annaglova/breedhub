import React from 'react';
import { type Table } from '@tanstack/react-table';
import { Button } from '@ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/components/select';
import { cn } from '@/shared/utils';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  canPreviousPage: boolean;
  canNextPage: boolean;
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  totalRows: number;
  pageSizeOptions?: number[];
  selectedRows?: TData[];
  showSelection?: boolean;
  className?: string;
}

export function DataTablePagination<TData>({
  table,
  canPreviousPage,
  canNextPage,
  pageCount,
  pageIndex,
  pageSize,
  totalRows,
  pageSizeOptions = [10, 20, 30, 40, 50],
  selectedRows = [],
  showSelection = false,
  className,
}: DataTablePaginationProps<TData>) {
  const startRow = pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div className={cn(
      "flex items-center justify-between px-2",
      className
    )}>
      {/* Selection info */}
      <div className="flex-1 text-sm text-muted-foreground">
        {showSelection && selectedRows.length > 0 ? (
          <span>
            {selectedRows.length} of {totalRows} row(s) selected
          </span>
        ) : (
          <span>
            Showing {startRow} to {endRow} of {totalRows} entries
          </span>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-6 lg:space-x-8">
        {/* Page size selector */}
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page info */}
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {pageIndex + 1} of {Math.max(pageCount, 1)}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center space-x-2">
          {/* First page */}
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to first page</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to previous page</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>

          {/* Next page */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to next page</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Button>

          {/* Last page */}
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to last page</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Compact pagination for mobile
export function DataTablePaginationCompact<TData>({
  table,
  canPreviousPage,
  canNextPage,
  pageIndex,
  pageCount,
  totalRows,
  className,
}: Pick<DataTablePaginationProps<TData>, 
  | 'table' 
  | 'canPreviousPage' 
  | 'canNextPage' 
  | 'pageIndex' 
  | 'pageCount' 
  | 'totalRows'
  | 'className'
>) {
  return (
    <div className={cn(
      "flex items-center justify-between px-2 py-4",
      className
    )}>
      <div className="text-sm text-muted-foreground">
        {totalRows} total entries
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!canPreviousPage}
        >
          Previous
        </Button>
        
        <div className="text-sm font-medium">
          {pageIndex + 1} / {Math.max(pageCount, 1)}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!canNextPage}
        >
          Next
        </Button>
      </div>
    </div>
  );
}