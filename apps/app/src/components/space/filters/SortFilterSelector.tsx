import { Button } from "@ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib/utils";
import { Filter } from "lucide-react";
import { useState } from "react";
import { FiltersDialog } from "./FiltersDialog";
import { SortOption, SortSelector } from "./SortSelector";

// Re-export SortOption for convenience
export type { SortOption };

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
    <TooltipProvider>
      <div className={cn("inline-flex", className)}>
        <SortSelector
          options={sortOptions}
          selected={selectedSort}
          onSelect={onSortChange}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="small-button rounded-r-full bg-primary-50 hover:bg-primary-100/60 dark:bg-primary-300 dark:hover:bg-primary-200 text-primary dark:text-zinc-900 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
              onClick={handleFiltersClick}
              aria-label="Filters"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Set filters</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <FiltersDialog
        open={isFiltersDialogOpen}
        onOpenChange={setIsFiltersDialogOpen}
      />
    </TooltipProvider>
  );
}
