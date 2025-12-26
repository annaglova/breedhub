import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Chip } from "@ui/components/chip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib/utils";
import { useTabData } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";

interface PetTitle {
  id: string;
  name: string;
  countryCode: string;
  country: string;
}

interface PetAchievementsProps {
  entity?: any;
  /** Component mode shows expand/collapse button when > 5 titles */
  mode?: "component" | "page";
  /** DataSource config from space config */
  dataSource?: DataSourceConfig;
}

/**
 * PetAchievements - Displays pet titles/achievements as chips
 *
 * Based on Angular: libs/schema/domain/pet/lib/pet-titles/pet-titles.component.ts
 * Shows champion titles with country codes as chips with tooltips
 *
 * Data comes from title_in_pet_with_details VIEW via useTabData
 */
export function PetAchievements({
  entity,
  mode = "component",
  dataSource,
}: PetAchievementsProps) {
  const [expanded, setExpanded] = useState(false);

  const petId = entity?.id;

  // Load titles via useTabData (config-driven, local-first)
  const { data, isLoading } = useTabData({
    parentId: petId,
    dataSource: dataSource!,
    enabled: !!dataSource && !!petId,
  });

  // Transform VIEW data to component format
  const titles = useMemo<PetTitle[]>(() => {
    if (!data || data.length === 0) return [];

    return data.map((item: any) => ({
      id: item.id,
      name: item.title_name || "",
      countryCode: item.country_code || "",
      country: item.country_name || "",
    }));
  }, [data]);

  const isComponentMode = mode === "component";
  const displayCount = expanded ? titles.length : 5;
  const hasMoreTitles = titles.length > 5;
  const visibleTitles = isComponentMode
    ? titles.slice(0, displayCount)
    : titles;

  const buttonLabel = expanded ? "Show main titles" : "Show all titles";

  // Don't render if no dataSource or loading with no data yet
  if (!dataSource || (isLoading && titles.length === 0)) {
    return null;
  }

  if (titles.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("pt-3", isComponentMode && titles.length > 0 && "pb-6")}
    >
      <div
        aria-label="pet titles"
        className="flex flex-wrap items-center gap-2 font-medium"
      >
        {/* Expand/collapse button - only in component mode with 6+ titles */}
        {isComponentMode && hasMoreTitles && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    "border border-surface-600 dark:border-surface-400",
                    "text-surface-600 dark:text-surface-400",
                    "hover:bg-surface-50 dark:hover:bg-surface-700",
                    "transition-colors"
                  )}
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-150",
                      expanded && "rotate-180"
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{buttonLabel}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Title chips */}
        {visibleTitles.map((title) => (
          <TooltipProvider key={title.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Chip
                    label={`${title.name}${title.countryCode ? ` ${title.countryCode}` : ""}`}
                    variant="primary"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>
                  {title.name}{title.country ? ` ${title.country}` : ""}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        {/* "More" indicator chip when collapsed and has more titles */}
        {isComponentMode && hasMoreTitles && !expanded && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="cursor-pointer"
                >
                  <Chip
                    label={`+${titles.length - 5}`}
                    variant="secondary"
                    className="hover:opacity-80 transition-opacity"
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Show all {titles.length} titles</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
