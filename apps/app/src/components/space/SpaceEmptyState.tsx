import { Button } from "@ui/components/button";
import { Chip } from "@ui/components/chip";
import { cn } from "@ui/lib/utils";
import { SearchX } from "lucide-react";
import { useEffect, useRef } from "react";
import type { FilterField } from "./filters/FiltersSection";

interface SpaceEmptyStateProps {
  filters: FilterField[];
  onFilterRemove: (filter: FilterField) => void;
  onClearAll: () => void;
  searchQuery?: string;
  entityLabelPlural?: string;
  className?: string;
}

export function SpaceEmptyState({
  filters,
  onFilterRemove,
  onClearAll,
  searchQuery,
  entityLabelPlural = "items",
  className,
}: SpaceEmptyStateProps) {
  const visibleFilters = filters;
  const removableFilters = filters.filter((f) => !f.isRequired);
  const hasFilters = visibleFilters.length > 0;
  const hasRemovableFilters = removableFilters.length > 0;
  const headlineRef = useRef<HTMLHeadingElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevRemovableCountRef = useRef(removableFilters.length);

  // Focus management after a chip is removed: shift focus to the next
  // removable chip's × button, or to the headline when the last chip goes.
  useEffect(() => {
    const prev = prevRemovableCountRef.current;
    const curr = removableFilters.length;
    prevRemovableCountRef.current = curr;

    if (curr >= prev) return;

    const active = document.activeElement;
    const stillFocused = active && containerRef.current?.contains(active);
    if (stillFocused) return;

    if (curr === 0) {
      headlineRef.current?.focus();
    } else {
      const nextChipRemove = containerRef.current?.querySelector<HTMLButtonElement>(
        'ul[role="list"] button'
      );
      nextChipRemove?.focus();
    }
  }, [removableFilters.length]);

  const headline = searchQuery
    ? `No ${entityLabelPlural} match "${searchQuery}"`
    : `No ${entityLabelPlural} match these filters`;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="No matching results"
      className={cn(
        "flex w-full h-full items-center justify-center px-6 py-16",
        className
      )}
    >
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600"
        >
          <SearchX className="h-7 w-7" />
        </div>

        <h2
          ref={headlineRef}
          tabIndex={-1}
          className="text-xl font-semibold text-slate-900 focus:outline-none"
        >
          {headline}
        </h2>

        {hasFilters && (
          <div className="flex w-full flex-col items-center gap-3">
            <span className="text-sm text-slate-600">Active filters:</span>
            <ul role="list" className="flex flex-wrap items-center justify-center gap-2">
              {visibleFilters.map((filter) => (
                <li key={filter.id}>
                  <Chip
                    label={filter.label}
                    removable={!filter.isRequired}
                    onRemove={
                      filter.isRequired ? undefined : () => onFilterRemove(filter)
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasRemovableFilters && (
          <Button
            type="button"
            onClick={onClearAll}
            className="focus-visible:ring-2 focus-visible:ring-primary-500/50"
          >
            Clear all filters
          </Button>
        )}
      </div>
    </div>
  );
}
