import React from 'react';
import { type Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Button } from '@ui/components/button';
import { cn } from '@/shared/utils';

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: React.ReactNode;
  className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return (
      <div className={cn("text-left", className)}>
        {title}
      </div>
    );
  }

  const sorted = column.getIsSorted();

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 p-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(sorted === "asc")}
      >
        <span>{title}</span>
        {sorted === "desc" ? (
          <ArrowDown className="ml-2 h-4 w-4" aria-hidden="true" />
        ) : sorted === "asc" ? (
          <ArrowUp className="ml-2 h-4 w-4" aria-hidden="true" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}