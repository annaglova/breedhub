import React, { useState, useEffect } from 'react';
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
  slug?: string; // Short URL slug for filter (e.g., "type" instead of "breed_field_pet_type_id")
  value?: any;
  validation?: any;
  order: number;
  referencedTable?: string;
  referencedFieldID?: string;
  referencedFieldName?: string;
  // Filter behavior props
  dependsOn?: string; // Field ID that this field depends on (cascade filter)
  disabledUntil?: string; // Field ID - this field is disabled until that field has a value
  filterBy?: string; // Field name in referenced table to filter options by dependsOn value
}

interface FiltersSectionProps {
  filters?: FilterField[];
  onFilterRemove?: (filter: FilterField) => void;
  onFiltersApply?: (values: Record<string, any>) => void;
  sortOptions?: SortOption[];
  defaultSortOption?: SortOption;
  onSortChange?: (option: SortOption) => void;
  filterFields?: FilterFieldConfig[];
  currentFilterValues?: Record<string, any>;
  className?: string;
}

/**
 * FiltersSection - displays active filters as chips + sort/filter selector buttons
 * Matches Angular's ExpandedFiltersV2Component functionality
 */
export function FiltersSection({
  filters = [],
  onFilterRemove,
  onFiltersApply,
  sortOptions,
  defaultSortOption,
  onSortChange,
  filterFields,
  currentFilterValues,
  className
}: FiltersSectionProps) {
  const [selectedSort, setSelectedSort] = useState<SortOption | undefined>(defaultSortOption);

  // Sync selectedSort with defaultSortOption when it changes (e.g., navigating between spaces)
  useEffect(() => {
    setSelectedSort(defaultSortOption);
  }, [defaultSortOption]);

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
        onFiltersApply={onFiltersApply}
        filterFields={filterFields}
        currentFilterValues={currentFilterValues}
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
