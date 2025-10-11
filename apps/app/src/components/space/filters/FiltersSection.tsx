import React, { useState } from 'react';
import { Chip } from '@ui/components/chip';
import { SortFilterSelector, SortOption } from './SortFilterSelector';
import { cn } from '@ui/lib/utils';

export interface FilterField {
  id: string;
  label: string;
  isRequired?: boolean;
}

export interface FilterFieldConfig {
  id: string;
  displayName: string;
  component: string;
  placeholder?: string;
  fieldType: string;
  required?: boolean;
  operator?: string;
  value?: any;
  validation?: any;
  order: number;
  referencedTable?: string;
  referencedFieldID?: string;
  referencedFieldName?: string;
}

interface FiltersSectionProps {
  filters?: FilterField[];
  onFilterRemove?: (filter: FilterField) => void;
  sortOptions?: SortOption[];
  defaultSortOption?: SortOption;
  onSortChange?: (option: SortOption) => void;
  filterFields?: FilterFieldConfig[];
  className?: string;
}

/**
 * FiltersSection - displays active filters as chips + sort/filter selector buttons
 * Matches Angular's ExpandedFiltersV2Component functionality
 */
export function FiltersSection({
  filters = [],
  onFilterRemove,
  sortOptions,
  defaultSortOption,
  onSortChange,
  filterFields,
  className
}: FiltersSectionProps) {
  const [selectedSort, setSelectedSort] = useState<SortOption | undefined>(defaultSortOption);

  const handleSortChange = (option: SortOption) => {
    setSelectedSort(option);
    onSortChange?.(option);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <SortFilterSelector
        className="mr-3"
        sortOptions={sortOptions}
        selectedSort={selectedSort}
        onSortChange={handleSortChange}
        filterFields={filterFields}
      />

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
