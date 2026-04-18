import { Button } from "@ui/components/button";
import { SearchInput } from "@ui/components/form-inputs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib/utils";
import { Plus } from "lucide-react";
import { EntitiesCounter } from "./EntitiesCounter";
import { FiltersSection } from "./filters";
import { ViewChanger } from "./ViewChanger";

interface SpaceHeaderProps {
  title: string;
  viewTypes?: string[];
  viewConfigs?: Array<{
    id: string;
    icon?: string;
    tooltip?: string;
  }>;
  onViewChange?: (view: string) => void;
  entitySchemaName: string;
  entitiesCount: number;
  total: number;
  recordsCount: number;
  totalFilterKey?: string;
  totalFilterValue?: any;
  loading?: boolean;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange?: (value: string) => void;
  canAdd?: boolean;
  onCreateNew?: () => void;
  needCardClass?: boolean;
  sortOptions?: any[];
  defaultSortOption?: any;
  onSortChange?: (option: any) => void;
  filterFields?: any[];
  filters?: any[];
  onFilterRemove?: (filter: any) => void;
  onFiltersApply?: (values: Record<string, any>) => void;
  currentFilterValues?: Record<string, any>;
  showCounter?: boolean;
}

export function SpaceHeader({
  title,
  viewTypes,
  viewConfigs,
  onViewChange,
  entitySchemaName,
  entitiesCount,
  total,
  recordsCount,
  totalFilterKey,
  totalFilterValue,
  loading = false,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  canAdd = false,
  onCreateNew,
  needCardClass = false,
  sortOptions,
  defaultSortOption,
  onSortChange,
  filterFields,
  filters,
  onFilterRemove,
  onFiltersApply,
  currentFilterValues,
  showCounter = true,
}: SpaceHeaderProps) {
  return (
    <div className="z-20 flex flex-col justify-between border-b border-surface-border space-padding">
      <div className="w-full">
        <div className="flex w-full justify-between">
          <h1 className="text-3xl sm:text-4xl">{title}</h1>
          <ViewChanger
            views={viewTypes || []}
            viewConfigs={viewConfigs}
            onViewChange={onViewChange}
          />
        </div>
        {showCounter && (
          <EntitiesCounter
            entitiesCount={entitiesCount}
            total={total}
            entityType={entitySchemaName}
            initialCount={recordsCount}
            totalFilterKey={totalFilterKey}
            totalFilterValue={totalFilterValue}
          />
        )}
      </div>

      <div className="mt-4 flex items-center space-x-3">
        <SearchInput
          value={searchValue}
          onValueChange={onSearchChange}
          placeholder={searchPlaceholder}
          pill
          disabled={loading}
          showClearButton={!loading}
          className="w-full"
        />

        {canAdd &&
          (loading ? (
            <Button
              className={cn(
                "rounded-full font-bold flex-shrink-0",
                needCardClass
                  ? "h-[2.25rem] px-4"
                  : "h-[2.25rem] w-[2.25rem] flex items-center justify-center",
              )}
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              {needCardClass && (
                <span className="text-base font-semibold">Add</span>
              )}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onCreateNew}
                  className={cn(
                    "rounded-full font-bold flex-shrink-0",
                    needCardClass
                      ? "h-[2.25rem] px-4"
                      : "h-[2.25rem] w-[2.25rem] flex items-center justify-center",
                  )}
                >
                  <Plus className="h-4 w-4 flex-shrink-0" />
                  {needCardClass && (
                    <span className="text-base font-semibold">Add</span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Add new record</p>
              </TooltipContent>
            </Tooltip>
          ))}
      </div>

      <FiltersSection
        className="mt-4"
        sortOptions={sortOptions}
        defaultSortOption={defaultSortOption}
        onSortChange={onSortChange}
        filterFields={filterFields}
        filters={filters}
        onFilterRemove={onFilterRemove}
        onFiltersApply={onFiltersApply}
        currentFilterValues={currentFilterValues}
      />
    </div>
  );
}
