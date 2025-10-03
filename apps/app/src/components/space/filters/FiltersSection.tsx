import React from 'react';
import { Chip } from '@ui/components/chip';
import { SortFilterSelector } from './SortFilterSelector';
import { cn } from '@ui/lib/utils';

export interface FilterField {
  id: string;
  label: string;
  isRequired?: boolean;
}

interface FiltersSectionProps {
  filters?: FilterField[];
  onFilterRemove?: (filter: FilterField) => void;
  className?: string;
}

/**
 * FiltersSection - displays active filters as chips + sort/filter selector buttons
 * Matches Angular's ExpandedFiltersV2Component functionality
 */
export function FiltersSection({ filters = [], onFilterRemove, className }: FiltersSectionProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <SortFilterSelector className="mr-3" />

      {filters.map((filter) => (
        <Chip
          key={filter.id}
          label={filter.label}
          removable={!filter.isRequired}
          onRemove={() => onFilterRemove?.(filter)}
        />
      ))}
    </div>
  );
}
