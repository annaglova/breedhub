import { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type Row,
} from '@tanstack/react-table';

export interface DataTableConfig<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  
  // Pagination
  pageSize?: number;
  pageSizeOptions?: number[];
  
  // Sorting
  defaultSorting?: SortingState;
  enableSorting?: boolean;
  enableMultiSort?: boolean;
  
  // Filtering
  enableFiltering?: boolean;
  enableColumnFilters?: boolean;
  enableGlobalFilter?: boolean;
  globalFilterFn?: string;
  
  // Column visibility
  defaultColumnVisibility?: VisibilityState;
  
  // Row selection
  enableRowSelection?: boolean;
  enableMultiRowSelection?: boolean;
  
  // Callbacks
  onRowClick?: (row: Row<TData>) => void;
  onSelectionChange?: (selectedRows: TData[]) => void;
}

export interface UseDataTableReturn<TData> {
  table: ReturnType<typeof useReactTable<TData>>;
  
  // State
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;
  columnFilters: ColumnFiltersState;
  setColumnFilters: (filters: ColumnFiltersState) => void;
  columnVisibility: VisibilityState;
  setColumnVisibility: (visibility: VisibilityState) => void;
  rowSelection: Record<string, boolean>;
  setRowSelection: (selection: Record<string, boolean>) => void;
  globalFilter: string;
  setGlobalFilter: (filter: string) => void;
  
  // Computed values
  selectedRows: TData[];
  isAllRowsSelected: boolean;
  isSomeRowsSelected: boolean;
  
  // Actions
  resetFilters: () => void;
  resetSorting: () => void;
  resetSelection: () => void;
  resetAll: () => void;
  
  // Pagination helpers
  canPreviousPage: boolean;
  canNextPage: boolean;
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  totalRows: number;
  
  // Column helpers
  getVisibleColumns: () => string[];
  getHiddenColumns: () => string[];
  toggleColumnVisibility: (columnId: string) => void;
}

export function useDataTable<TData>({
  data,
  columns,
  pageSize = 10,
  pageSizeOptions = [10, 20, 30, 40, 50],
  defaultSorting = [],
  enableSorting = true,
  enableMultiSort = true,
  enableFiltering = true,
  enableColumnFilters = true,
  enableGlobalFilter = true,
  globalFilterFn = 'includesString',
  defaultColumnVisibility = {},
  enableRowSelection = false,
  enableMultiRowSelection = true,
  onRowClick,
  onSelectionChange,
}: DataTableConfig<TData>): UseDataTableReturn<TData> {
  // State
  const [sorting, setSorting] = useState<SortingState>(defaultSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultColumnVisibility);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [globalFilter, setGlobalFilter] = useState('');

  // Create table instance
  const table = useReactTable({
    data,
    columns,
    
    // Core
    getCoreRowModel: getCoreRowModel(),
    
    // Sorting
    onSortingChange: setSorting,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    enableSorting,
    enableMultiSort,
    
    // Filtering
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    getFacetedRowModel: enableFiltering ? getFacetedRowModel() : undefined,
    getFacetedUniqueValues: enableFiltering ? getFacetedUniqueValues() : undefined,
    
    // Column visibility
    onColumnVisibilityChange: setColumnVisibility,
    
    // Row selection
    onRowSelectionChange: setRowSelection,
    enableRowSelection,
    enableMultiRowSelection,
    
    // Pagination
    getPaginationRowModel: getPaginationRowModel(),
    
    // State
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    
    // Initial state
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  // Computed values
  const selectedRows = useMemo(() => {
    return table.getFilteredSelectedRowModel().rows.map(row => row.original);
  }, [table, rowSelection]);

  const isAllRowsSelected = table.getIsAllRowsSelected();
  const isSomeRowsSelected = table.getIsSomeRowsSelected();

  // Actions
  const resetFilters = useCallback(() => {
    setColumnFilters([]);
    setGlobalFilter('');
  }, []);

  const resetSorting = useCallback(() => {
    setSorting(defaultSorting);
  }, [defaultSorting]);

  const resetSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  const resetAll = useCallback(() => {
    resetFilters();
    resetSorting();
    resetSelection();
  }, [resetFilters, resetSorting, resetSelection]);

  // Pagination helpers
  const canPreviousPage = table.getCanPreviousPage();
  const canNextPage = table.getCanNextPage();
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const currentPageSize = table.getState().pagination.pageSize;
  const totalRows = table.getFilteredRowModel().rows.length;

  // Column helpers
  const getVisibleColumns = useCallback(() => {
    return table.getVisibleLeafColumns().map(column => column.id);
  }, [table]);

  const getHiddenColumns = useCallback(() => {
    return table.getAllLeafColumns()
      .filter(column => !column.getIsVisible())
      .map(column => column.id);
  }, [table]);

  const toggleColumnVisibility = useCallback((columnId: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  }, []);

  // Effect to call onSelectionChange when selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedRows);
    }
  }, [selectedRows, onSelectionChange]);

  return {
    table,
    
    // State
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
    
    // Computed values
    selectedRows,
    isAllRowsSelected,
    isSomeRowsSelected,
    
    // Actions
    resetFilters,
    resetSorting,
    resetSelection,
    resetAll,
    
    // Pagination helpers
    canPreviousPage,
    canNextPage,
    pageCount,
    pageIndex,
    pageSize: currentPageSize,
    totalRows,
    
    // Column helpers
    getVisibleColumns,
    getHiddenColumns,
    toggleColumnVisibility,
  };
}