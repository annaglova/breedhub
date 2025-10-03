import React, { useState } from 'react';
import { Button } from '@ui/components/button';
import { Filter } from 'lucide-react';
import { SortSelector, SortOption } from './SortSelector';
import { FiltersDialog } from './FiltersDialog';
import { cn } from '@ui/lib/utils';

interface SortFilterSelectorProps {
  className?: string;
  sortOptions?: SortOption[];
  selectedSort?: SortOption;
  onSortChange?: (option: SortOption) => void;
  onFiltersOpen?: () => void;
}

export function SortFilterSelector({
  className,
  sortOptions = [],
  selectedSort,
  onSortChange,
  onFiltersOpen,
}: SortFilterSelectorProps) {
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);

  const handleFiltersClick = () => {
    setIsFiltersDialogOpen(true);
    onFiltersOpen?.();
  };

  return (
    <>
      <div className={cn("inline-flex", className)}>
        <SortSelector
          options={sortOptions}
          selected={selectedSort}
          onSelect={onSortChange}
        />
        <Button
          variant="outline"
          size="icon"
          className="small-button rounded-r-full border-l-0"
          onClick={handleFiltersClick}
          aria-label="Filters"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <FiltersDialog
        open={isFiltersDialogOpen}
        onOpenChange={setIsFiltersDialogOpen}
      />
    </>
  );
}
