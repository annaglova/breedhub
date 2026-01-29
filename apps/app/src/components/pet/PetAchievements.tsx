import { dictionaryStore } from "@breedhub/rxdb-store";
import { Chip } from "@ui/components/chip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib/utils";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface TitleDisplayItem {
  id: string;
  name: string;
  rating: number;
  country_id?: string;
  amount?: number;
  date?: string;
  confirmed?: boolean;
}

interface PetTitle {
  id: string;
  name: string;
  countryCode: string;
  country: string;
  rating?: number;
}

interface PetAchievementsProps {
  entity?: any;
  /** Component mode shows expand/collapse button when > 5 titles */
  mode?: "component" | "page";
}

/**
 * PetAchievements - Displays pet titles/achievements as chips
 *
 * Uses titles_display JSONB field from pet entity for instant rendering.
 * Only resolves country lookups via dictionaryStore for country code/name.
 */
export function PetAchievements({
  entity,
  mode = "component",
}: PetAchievementsProps) {
  const [expanded, setExpanded] = useState(false);
  const [countriesMap, setCountriesMap] = useState<Map<string, any>>(new Map());
  const [lookupsLoading, setLookupsLoading] = useState(false);

  const petId = entity?.id;
  const titlesDisplay = entity?.titles_display as TitleDisplayItem[] | undefined;

  // Reset expanded state when navigating to a different pet
  useEffect(() => {
    setExpanded(false);
  }, [petId]);

  // Load country lookups for country_id resolution
  useEffect(() => {
    if (!titlesDisplay?.length) {
      setCountriesMap(new Map());
      return;
    }

    async function loadCountryLookups() {
      setLookupsLoading(true);

      // Ensure dictionaryStore is initialized
      if (!dictionaryStore.initialized.value) {
        await dictionaryStore.initialize();
      }

      // Extract unique country IDs
      const countryIds = new Set<string>();
      titlesDisplay.forEach((item) => {
        if (item.country_id) countryIds.add(item.country_id);
      });

      if (countryIds.size === 0) {
        setCountriesMap(new Map());
        setLookupsLoading(false);
        return;
      }

      // Load country records in parallel
      const results = await Promise.all(
        Array.from(countryIds).map(async (id) => {
          const record = await dictionaryStore.getRecordById("country", id);
          return [id, record] as [string, any];
        })
      );

      const newCountriesMap = new Map<string, any>();
      results.forEach(([id, record]) => {
        if (record) newCountriesMap.set(id, record);
      });

      setCountriesMap(newCountriesMap);
      setLookupsLoading(false);
    }

    loadCountryLookups();
  }, [titlesDisplay]);

  // Transform titles_display with country lookups
  const titles = useMemo<PetTitle[]>(() => {
    if (!titlesDisplay?.length) return [];

    return titlesDisplay.map((item) => {
      const country = item.country_id ? countriesMap.get(item.country_id) : null;

      return {
        id: item.id,
        name: item.name || "",
        countryCode: country?.code || "",
        country: country?.name || "",
        rating: item.rating ?? 0,
      };
    });
    // Data is already sorted by rating in JSONB from initialization script
  }, [titlesDisplay, countriesMap]);

  const isLoading = lookupsLoading;

  const isComponentMode = mode === "component";
  const displayCount = expanded ? titles.length : 5;
  const hasMoreTitles = titles.length > 5;
  const visibleTitles = isComponentMode
    ? titles.slice(0, displayCount)
    : titles;

  const buttonLabel = expanded ? "Show main titles" : "Show all titles";

  // Don't render if no titles_display data
  if (!titlesDisplay?.length) {
    return null;
  }

  // Show loading state while resolving country lookups
  if (isLoading && titles.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        // Page mode: horizontal padding to match BreedAchievementsTab
        !isComponentMode && "px-6"
      )}
    >
      <div
        aria-label="pet titles"
        className="flex flex-wrap items-center gap-2 mt-2"
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
        {visibleTitles.map((title, index) => (
          <TooltipProvider key={`${title.id}-${title.countryCode}-${index}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Chip
                    label={`${title.name}${
                      title.countryCode ? ` ${title.countryCode}` : ""
                    }`}
                    variant="primary"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>
                  {title.name}
                  {title.country ? ` ${title.country}` : ""}
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
