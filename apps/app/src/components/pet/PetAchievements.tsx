import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { dictionaryStore, useTabData } from "@breedhub/rxdb-store";
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
  /** DataSource config from space config */
  dataSource?: DataSourceConfig;
}

/**
 * PetAchievements - Displays pet titles/achievements as chips
 *
 * Based on Angular: libs/schema/domain/pet/lib/pet-titles/pet-titles.component.ts
 * Shows champion titles with country codes as chips with tooltips
 *
 * Uses Pattern B: Load child records + resolve lookups via dictionaryStore
 * - title_in_pet child records (title_id, country_id)
 * - title lookup (name, rating)
 * - country lookup (name, code)
 */
export function PetAchievements({
  entity,
  mode = "component",
  dataSource,
}: PetAchievementsProps) {
  const [expanded, setExpanded] = useState(false);
  const [titlesMap, setTitlesMap] = useState<Map<string, any>>(new Map());
  const [countriesMap, setCountriesMap] = useState<Map<string, any>>(new Map());
  const [lookupsLoading, setLookupsLoading] = useState(false);

  const petId = entity?.id;

  // Reset expanded state when navigating to a different pet
  useEffect(() => {
    setExpanded(false);
  }, [petId]);

  // Load title_in_pet child records via useTabData (config-driven, local-first)
  const { data: rawData, isLoading: dataLoading } = useTabData({
    parentId: petId,
    dataSource: dataSource!,
    enabled: !!dataSource && !!petId,
  });

  // Load lookups by specific IDs from child records (Pattern B)
  useEffect(() => {
    if (dataLoading || !rawData?.length) {
      setTitlesMap(new Map());
      setCountriesMap(new Map());
      return;
    }

    async function loadLookupsByIds() {
      setLookupsLoading(true);

      // Ensure dictionaryStore is initialized
      if (!dictionaryStore.initialized.value) {
        await dictionaryStore.initialize();
      }

      // Extract unique IDs from child records
      const titleIds = new Set<string>();
      const countryIds = new Set<string>();

      rawData.forEach((item: any) => {
        const titleId = item.additional?.title_id || item.title_id;
        const countryId = item.additional?.country_id || item.country_id;
        if (titleId) titleIds.add(titleId);
        if (countryId) countryIds.add(countryId);
      });

      // Load only needed records in parallel
      const lookupPromises: Promise<[string, string, any]>[] = [];

      titleIds.forEach((id) => {
        lookupPromises.push(
          dictionaryStore
            .getRecordById("title", id)
            .then((record) => ["title", id, record] as [string, string, any])
        );
      });

      countryIds.forEach((id) => {
        lookupPromises.push(
          dictionaryStore
            .getRecordById("country", id)
            .then((record) => ["country", id, record] as [string, string, any])
        );
      });

      const results = await Promise.all(lookupPromises);

      // Build maps from results
      const newTitlesMap = new Map<string, any>();
      const newCountriesMap = new Map<string, any>();

      results.forEach(([type, id, record]) => {
        if (!record) return;
        if (type === "title") newTitlesMap.set(id, record);
        else if (type === "country") newCountriesMap.set(id, record);
      });

      setTitlesMap(newTitlesMap);
      setCountriesMap(newCountriesMap);
      setLookupsLoading(false);
    }

    loadLookupsByIds();
  }, [rawData, dataLoading]);

  // Transform and enrich data with lookups, then sort by rating
  const titles = useMemo<PetTitle[]>(() => {
    if (!rawData || rawData.length === 0) return [];

    const enriched = rawData.map((item: any) => {
      const titleId = item.additional?.title_id || item.title_id;
      const countryId = item.additional?.country_id || item.country_id;
      const title = titlesMap.get(titleId);
      const country = countriesMap.get(countryId);

      return {
        id: item.id,
        name: title?.name || "",
        countryCode: country?.code || "",
        country: country?.name || "",
        rating: title?.rating ?? 0,
      };
    });

    // Sort by rating (desc), then by name (asc)
    return enriched.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.name.localeCompare(b.name);
    });
  }, [rawData, titlesMap, countriesMap]);

  const isLoading = dataLoading || lookupsLoading;

  const isComponentMode = mode === "component";
  const displayCount = expanded ? titles.length : 5;
  const hasMoreTitles = titles.length > 5;
  const visibleTitles = isComponentMode
    ? titles.slice(0, displayCount)
    : titles;

  const buttonLabel = expanded ? "Show main titles" : "Show all titles";

  // Don't render if no dataSource configured
  if (!dataSource) {
    return null;
  }

  // Show skeleton while loading to prevent layout shift
  if (isLoading && titles.length === 0) {
    return (
      <div
        className={cn(
          !isComponentMode && "px-6"
        )}
      >
        <div className="flex flex-wrap items-center gap-2 mt-2 min-h-[2rem]">
          <div className="h-7 w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
          <div className="h-7 w-16 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
          <div className="h-7 w-24 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  // Don't render if no achievements after loading
  if (titles.length === 0) {
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
        className="flex flex-wrap items-center gap-2  mt-2"
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
