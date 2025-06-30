// Main DataTable component
export { DataTable, createDataTable, type DataTableProps } from './components/DataTable';

// DataTable sub-components
export { DataTableColumnHeader } from './components/DataTableColumnHeader';
export { DataTablePagination, DataTablePaginationCompact } from './components/DataTablePagination';
export { DataTableToolbar, DataTableAdvancedFilter } from './components/DataTableToolbar';
export { DataTableRowActions, commonRowActions, type RowAction } from './components/DataTableRowActions';

// Hook and types
export { useDataTable, type DataTableConfig, type UseDataTableReturn } from './hooks/useDataTable';

// Column helpers
export {
  createSelectionColumn,
  createAvatarColumn,
  createTextColumn,
  createBadgeColumn,
  createDateColumn,
  createNumberColumn,
  createBooleanColumn,
} from './utils/columnHelpers';