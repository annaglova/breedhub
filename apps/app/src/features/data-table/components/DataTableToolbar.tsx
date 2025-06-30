import React from 'react';
import { type Table } from '@tanstack/react-table';
import {
  Button,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Checkbox,
} from 'ui';
import { cn } from '@/shared/utils';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  searchPlaceholder?: string;
  resetFilters: () => void;
  resetAll: () => void;
  columnVisibility: Record<string, boolean>;
  toggleColumnVisibility: (columnId: string) => void;
  actions?: React.ReactNode;
  selectedRows?: TData[];
  selectionActions?: React.ReactNode;
  showSelection?: boolean;
  className?: string;
}

export function DataTableToolbar<TData>({
  table,
  globalFilter,
  setGlobalFilter,
  searchPlaceholder = "Search...",
  resetFilters,
  resetAll,
  columnVisibility,
  toggleColumnVisibility,
  actions,
  selectedRows = [],
  selectionActions,
  showSelection = false,
  className,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || globalFilter.length > 0;
  const hasSelection = showSelection && selectedRows.length > 0;

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex flex-1 items-center space-x-2">
        {/* Global search */}
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
          startIcon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />

        {/* Active filters */}
        {isFiltered && (
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="h-6">
              {table.getState().columnFilters.length + (globalFilter ? 1 : 0)} filter(s)
            </Badge>
            <Button
              variant="ghost"
              onClick={resetFilters}
              className="h-8 px-2 lg:px-3"
            >
              Reset
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        )}

        {/* Selection actions */}
        {hasSelection && selectionActions && (
          <div className="flex items-center space-x-2">
            <Badge variant="default" className="h-6">
              {selectedRows.length} selected
            </Badge>
            {selectionActions}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {/* Custom actions */}
        {actions}

        {/* Column visibility */}
        <ColumnVisibilityToggle
          table={table}
          columnVisibility={columnVisibility}
          toggleColumnVisibility={toggleColumnVisibility}
        />

        {/* Settings menu */}
        <Button
          variant="outline"
          size="sm"
          onClick={resetAll}
          className="h-8 px-2 lg:px-3"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="sr-only lg:not-sr-only lg:ml-2">Reset all</span>
        </Button>
      </div>
    </div>
  );
}

// Column visibility toggle component
interface ColumnVisibilityToggleProps<TData> {
  table: Table<TData>;
  columnVisibility: Record<string, boolean>;
  toggleColumnVisibility: (columnId: string) => void;
}

function ColumnVisibilityToggle<TData>({
  table,
  columnVisibility,
  toggleColumnVisibility,
}: ColumnVisibilityToggleProps<TData>) {
  const allColumns = table.getAllLeafColumns();
  const visibleColumns = allColumns.filter(column => column.getIsVisible());
  const hiddenColumns = allColumns.filter(column => !column.getIsVisible());

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2 lg:px-3">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="sr-only lg:not-sr-only lg:ml-2">Columns</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Toggle columns</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Choose which columns to show in the table.
          </div>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {allColumns.map((column) => {
              if (!column.getCanHide()) return null;
              
              const columnHeader = column.columnDef.header;
              const columnTitle = typeof columnHeader === 'string' 
                ? columnHeader 
                : column.id;

              return (
                <div key={column.id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={column.getIsVisible()}
                    onCheckedChange={() => toggleColumnVisibility(column.id)}
                    id={column.id}
                  />
                  <label
                    htmlFor={column.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {columnTitle}
                  </label>
                </div>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                allColumns.forEach(column => {
                  if (column.getCanHide()) {
                    column.toggleVisibility(true);
                  }
                });
              }}
            >
              Show all
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                allColumns.forEach(column => {
                  if (column.getCanHide() && column.getIsVisible()) {
                    column.toggleVisibility(false);
                  }
                });
              }}
            >
              Hide all
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {visibleColumns.length} of {allColumns.length} columns visible
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Advanced filter component for specific columns
interface DataTableAdvancedFilterProps<TData> {
  table: Table<TData>;
  column: any; // Column from react-table
  title: string;
  options?: Array<{ label: string; value: string }>;
}

export function DataTableAdvancedFilter<TData>({
  table,
  column,
  title,
  options,
}: DataTableAdvancedFilterProps<TData>) {
  const facetedUniqueValues = column.getFacetedUniqueValues();
  const selectedValues = new Set(column.getFilterValue() as string[]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
          {title}
          {selectedValues.size > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 px-1">
              {selectedValues.size}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Filter by {title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {options ? (
              options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedValues.has(option.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        selectedValues.add(option.value);
                      } else {
                        selectedValues.delete(option.value);
                      }
                      column.setFilterValue(
                        selectedValues.size ? Array.from(selectedValues) : undefined
                      );
                    }}
                    id={option.value}
                  />
                  <label
                    htmlFor={option.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </label>
                </div>
              ))
            ) : (
              Array.from(facetedUniqueValues.keys())
                .sort()
                .map((value) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedValues.has(value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          selectedValues.add(value);
                        } else {
                          selectedValues.delete(value);
                        }
                        column.setFilterValue(
                          selectedValues.size ? Array.from(selectedValues) : undefined
                        );
                      }}
                      id={value}
                    />
                    <label
                      htmlFor={value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center justify-between w-full"
                    >
                      <span>{value}</span>
                      <span className="text-muted-foreground text-xs">
                        ({facetedUniqueValues.get(value)})
                      </span>
                    </label>
                  </div>
                ))
            )}
          </div>

          {selectedValues.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => column.setFilterValue(undefined)}
              className="w-full"
            >
              Clear filter
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}