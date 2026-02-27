import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  // Junction table filtering (many-to-many)
  junctionTable?: string;
  junctionField?: string;
  junctionFilterField?: string;
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

  // Drag-to-scroll (same pattern as PetPedigreeTab)
  const DRAG_THRESHOLD = 5;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isMouseDown = useRef(false);
  const hasDragged = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartLeft = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current || e.button !== 0) return;
    isMouseDown.current = true;
    hasDragged.current = false;
    dragStartX.current = e.clientX;
    scrollStartLeft.current = scrollRef.current.scrollLeft;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMouseDown.current || !scrollRef.current) return;
    const deltaX = e.clientX - dragStartX.current;
    if (!hasDragged.current && Math.abs(deltaX) >= DRAG_THRESHOLD) {
      hasDragged.current = true;
      setIsDragging(true);
    }
    if (hasDragged.current) {
      e.preventDefault();
      scrollRef.current.scrollLeft = scrollStartLeft.current - deltaX;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isMouseDown.current = false;
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    isMouseDown.current = false;
    hasDragged.current = false;
    setIsDragging(false);
  }, []);

  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDragged.current = false;
    }
  }, []);

  // Fade edges based on scroll position
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollFades();
    el.addEventListener("scroll", updateScrollFades);
    const ro = new ResizeObserver(updateScrollFades);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollFades);
      ro.disconnect();
    };
  }, [updateScrollFades, filters]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <SortFilterSelector
        className="shrink-0"
        sortOptions={sortOptions}
        selectedSort={selectedSort}
        onSortChange={handleSortChange}
        onFiltersApply={onFiltersApply}
        filterFields={filterFields}
        currentFilterValues={currentFilterValues}
      />

      {filters.length > 0 && (
        <div className="relative min-w-0 flex-1 self-stretch">
          {/* Left border */}
          {canScrollLeft && (
            <div className="absolute left-0 inset-y-0 w-px z-10 pointer-events-none bg-border" />
          )}
          {/* Right border */}
          {canScrollRight && (
            <div className="absolute right-0 inset-y-0 w-px z-10 pointer-events-none bg-border" />
          )}
          <div
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onClickCapture={handleClickCapture}
            className="flex items-center gap-2 overflow-x-auto scrollbar-hide h-full"
            style={{
              cursor: isDragging ? "grabbing" : undefined,
              userSelect: isDragging ? "none" : undefined,
            }}
          >
            {filters.map((filter) => (
              <Chip
                key={filter.id}
                label={filter.label}
                removable={!filter.isRequired}
                onRemove={() => onFilterRemove?.(filter)}
                className="shrink-0"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
