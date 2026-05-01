import { TabBodySkeleton } from "@/components/shared/TabBodySkeleton";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { formatDate } from "@/utils/format";
import { spaceStore, useTabData } from "@breedhub/rxdb-store";
import type { DataSourceConfig, MergedDictionaryItem } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { AlternatingTimeline } from "@ui/components/timeline";
import { Check } from "lucide-react";
import { useMemo, useEffect } from "react";

/**
 * Achievement item for timeline display
 */
interface TimelineAchievement {
  id: string;
  name: string;
  description: string;
  intValue: number;
  date?: string;
  active: boolean;
}

/**
 * Format currency value
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * BreedAchievementsTab - Support levels timeline
 *
 * Displays breed achievement/support levels in a timeline format.
 * Shows which levels have been achieved and when.
 *
 * Data flow (Config-Driven, Local-First):
 * 1. dataSource config defines what to load
 * 2. useTabData → TabDataService → SpaceStore + DictionaryStore → RxDB
 * 3. Data is merged automatically based on config (showAll: true)
 * 4. Component only handles UI rendering
 *
 * @see docs/TAB_DATA_SERVICE_ARCHITECTURE.md
 */
interface BreedAchievementsTabProps {
  dataSource?: DataSourceConfig[];
  onLoadedCount?: (count: number) => void; // Report loaded count for conditional fullscreen
  /** Set by TabOutletRenderer for top-N visible tabs in scroll mode (public).
   *  When provided, the tab reports its data-load state so AboveFoldLoadingContext
   *  can gate the page-level atomic transition (don't flip top blocks to real
   *  before the first tab body is also ready). */
  onAboveFoldReady?: (ready: boolean) => void;
}

export function BreedAchievementsTab({
  dataSource,
  onLoadedCount,
  onAboveFoldReady,
}: BreedAchievementsTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const breedId = selectedEntity?.id;

  // Timeline layout: "alternating" on fullscreen + large screens, "right" otherwise
  const isFullscreen = spaceStore.isFullscreen.value;
  const isLargeScreen = useMediaQuery("(min-width: 960px)");
  const timelineLayout = isFullscreen && isLargeScreen ? "alternating" : "right";

  // Load data via useTabData (config-driven, local-first)
  // TabDataService handles: child records + dictionary + merge
  const { data, isLoading, error } = useTabData<MergedDictionaryItem>({
    parentId: breedId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!breedId,
  });

  // Report loaded count for conditional fullscreen button
  useEffect(() => {
    if (!isLoading && data && onLoadedCount) {
      onLoadedCount(data.length);
    }
  }, [data, isLoading, onLoadedCount]);

  // Report above-fold ready state — only called when this tab is in the
  // top-N slot for AboveFoldLoadingContext gating (set by TabOutletRenderer
  // in scroll mode). Reports true when entity is available AND data has
  // finished loading — without the breedId guard, the tab would flip ready
  // immediately on mount (useTabData with enabled=false → isLoading=false)
  // and the page would briefly flash to real before tab data actually
  // arrives.
  useEffect(() => {
    onAboveFoldReady?.(!!breedId && !isLoading);
  }, [breedId, isLoading, onAboveFoldReady]);

  // Transform merged data to timeline format
  const achievements = useMemo<TimelineAchievement[]>(() => {
    if (!data || data.length === 0) return [];

    return data
      .filter((item) => (item.int_value ?? 0) >= 0) // Filter out special entries
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || "",
        intValue: item.int_value || 0,
        // _achievedRecord contains the child record with date in additional
        date: item._achievedRecord?.additional?.date,
        active: item._achieved,
      }));
  }, [data]);

  // No dataSource config - show warning
  if (!dataSource?.[0]) {
    return (
      <div className="py-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700 font-semibold">
            Missing dataSource configuration
          </p>
          <p className="text-yellow-600 text-sm mt-1">
            Add dataSource to tab config to enable data loading
          </p>
        </div>
      </div>
    );
  }

  // Loading skeleton — shared TabBodySkeleton (W1.3 view-tab unification)
  if (isLoading) {
    return <TabBodySkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="py-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">
            Failed to load achievements
          </p>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (achievements.length === 0) {
    return (
      <span className="text-secondary p-8 text-center block">
        No achievements data available
      </span>
    );
  }

  // Convert achievements to timeline items format
  const timelineItems = achievements.map((achievement) => ({
    id: achievement.id,
    title: achievement.name,
    description: achievement.description,
    date: achievement.date ? formatDate(achievement.date) : undefined,
    icon: achievement.active ? <Check className="h-4 w-4" /> : undefined,
    variant: achievement.active ? ("success" as const) : ("inactive" as const),
    content: (
      <div className="">
        <span className="text-xl font-bold text-primary">
          {formatCurrency(achievement.intValue)}
        </span>
      </div>
    ),
  }));

  return (
    <div className="sm:pr-5">
      <AlternatingTimeline
        items={timelineItems}
        layout={timelineLayout}
        showCards={true}
        connectorVariant="primary"
        size="default"
      />
    </div>
  );
}
