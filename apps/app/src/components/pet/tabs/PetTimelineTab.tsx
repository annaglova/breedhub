import { useSelectedEntity } from "@/contexts/SpaceContext";
import { useSkeletonWithDelay } from "@/contexts/AboveFoldLoadingContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { formatDate } from "@/utils/format";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import {
  AlternatingTimeline,
  AlternatingTimelineSkeleton,
} from "@ui/components/timeline";
import { Baby, Cake, HeartOff, Info, MoreVertical, Newspaper, Repeat, Sparkles, Trophy } from "lucide-react";
import { useMemo } from "react";

/**
 * Timeline event from JSONB (pet.timeline)
 */
interface TimelineEvent {
  id: string;  // post UUID
  d: string;   // date YYYY-MM-DD
  t: string;   // type: birthday, litter, show, date of death, publication, repost
}

/**
 * Type configuration for icons and styling
 */
const TYPE_CONFIG: Record<string, {
  icon: React.ReactNode;
  variant: "primary" | "success" | "default" | "inactive";
  label: string;
}> = {
  birthday: {
    icon: <Cake className="h-4 w-4" />,
    variant: "success",
    label: "Birthday"
  },
  litter: {
    icon: <Baby className="h-4 w-4" />,
    variant: "primary",
    label: "Litter"
  },
  show: {
    icon: <Trophy className="h-4 w-4" />,
    variant: "primary",
    label: "Show"
  },
  "date of death": {
    icon: <HeartOff className="h-4 w-4" />,
    variant: "default",
    label: "Passed away"
  },
  publication: {
    icon: <Newspaper className="h-4 w-4" />,
    variant: "inactive",
    label: "Publication"
  },
  repost: {
    icon: <Repeat className="h-4 w-4" />,
    variant: "inactive",
    label: "Repost"
  },
};

const DEFAULT_TYPE_CONFIG = {
  icon: <Info className="h-4 w-4" />,
  variant: "inactive" as const,
  label: "Event"
};

interface PetTimelineTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * PetTimelineTab - Pet's life timeline
 *
 * Displays important events from the pet's life:
 * - Birthday
 * - Show results/achievements
 * - Litters
 * - Death (if applicable)
 *
 * Data source: pet.timeline JSONB field
 */
export function PetTimelineTab({ onLoadedCount }: PetTimelineTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;
  // Match BreedAchievementsTab: only use alternating layout when there's
  // enough horizontal room (fullscreen AND md+). Drawer / narrow screens
  // collapse to the single-column "right" layout so cards stay readable
  // and don't get squashed.
  const isLargeScreen = useMediaQuery("(min-width: 960px)");
  const timelineLayout = isFullscreen && isLargeScreen ? "alternating" : "right";

  // Get timeline from entity JSONB (sorted DESC - newest first for display)
  const timeline = useMemo(() => {
    const events = (selectedEntity?.timeline as TimelineEvent[] | undefined) ?? [];
    // Reverse to show newest first (data is stored ASC)
    return [...events].reverse();
  }, [selectedEntity?.timeline]);

  // Check if pet has passed away (has death event in timeline)
  const hasPassedAway = useMemo(() => {
    return timeline.some(event => event.t === "date of death");
  }, [timeline]);

  // Convert timeline events to AlternatingTimeline format
  const timelineItems = useMemo(() => {
    if (timeline.length === 0) {
      return [];
    }

    const items = timeline.map((event) => {
      const config = TYPE_CONFIG[event.t] ?? DEFAULT_TYPE_CONFIG;
      return {
        id: event.id,
        title: config.label,
        date: formatDate(event.d),
        icon: config.icon,
        variant: config.variant,
      };
    });

    // Add optimistic "future" block for living pets
    if (!hasPassedAway) {
      items.unshift({
        id: "future-events",
        title: "The adventure continues",
        date: "",
        icon: <Sparkles className="h-4 w-4" />,
        variant: "success" as const,
      });
    }

    return items;
  }, [timeline, hasPassedAway]);

  // Create truncated version for drawer mode
  // Shows: birthday -> 3 next events -> gap -> latest/future
  const truncatedItems = useMemo(() => {
    // If 6 or fewer items, show all (no need for truncation)
    if (timelineItems.length <= 6) {
      return timelineItems;
    }

    // First item (future/latest at top)
    const firstItem = timelineItems[0];

    // Last 4 items: 3 events after birthday + birthday itself
    const lastFour = timelineItems.slice(-4);

    // Gap indicator with vertical three dots
    const gapItem = {
      id: "timeline-gap",
      title: "",
      date: "",
      icon: <MoreVertical className="h-4 w-4" />,
      variant: "inactive" as const,
      isGap: true,
      gapText: "View full timeline in fullscreen",
    };

    return [firstItem, gapItem, ...lastFour];
  }, [timelineItems]);

  // Use truncated in drawer + page fullscreen, full only in tab fullscreen
  const displayItems = isFullscreen ? timelineItems : truncatedItems;

  // Cold-load: entity not resolved yet (slug → id, fresh device, etc.)
  // Show the timeline-shaped skeleton instead of the empty-state copy so
  // the layout is reserved at the right height and the swap to real data
  // is jump-free. `selectedEntity?.timeline` being undefined also means
  // the JSONB hasn't arrived yet.
  // `useSkeletonWithDelay` enforces the shared SKELETON_ANTI_FLASH_MS
  // floor so a fast cache hit doesn't briefly flash skeleton.
  const showSkeleton = useSkeletonWithDelay(
    !selectedEntity || selectedEntity.timeline === undefined,
  );
  if (showSkeleton) {
    return (
      <div className="cursor-default sm:pr-5">
        <AlternatingTimelineSkeleton
          itemCount={isFullscreen ? 6 : 5}
          layout={timelineLayout}
          showCards={true}
        />
      </div>
    );
  }

  return (
    <div className="cursor-default sm:pr-5">
      {displayItems.length > 0 ? (
        <AlternatingTimeline
          items={displayItems}
          layout={timelineLayout}
          showCards={true}
          connectorVariant="primary"
        />
      ) : (
        <span className="text-secondary p-8 text-center block">
          No timeline events yet
        </span>
      )}
    </div>
  );
}
