import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { AlternatingTimeline } from "@ui/components/timeline";
import { Baby, Cake, HeartOff, Info, Newspaper, Repeat, Trophy } from "lucide-react";
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

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

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

  // Get timeline from entity JSONB (sorted DESC - newest first for display)
  const timeline = useMemo(() => {
    const events = (selectedEntity?.timeline as TimelineEvent[] | undefined) ?? [];
    // Reverse to show newest first (data is stored ASC)
    return [...events].reverse();
  }, [selectedEntity?.timeline]);

  // Convert timeline events to AlternatingTimeline format
  const timelineItems = useMemo(() => {
    if (timeline.length === 0) {
      return [];
    }

    return timeline.map((event) => {
      const config = TYPE_CONFIG[event.t] ?? DEFAULT_TYPE_CONFIG;
      return {
        id: event.id,
        title: config.label,
        date: formatDate(event.d),
        icon: config.icon,
        variant: config.variant,
      };
    });
  }, [timeline]);

  return (
    <div className="px-6 cursor-default">
      {timelineItems.length > 0 ? (
        <AlternatingTimeline
          items={timelineItems}
          layout={isFullscreen ? "alternating" : "right"}
          showCards={true}
          connectorVariant="primary"
        />
      ) : (
        <div className="card card-rounded flex flex-auto flex-col p-6 lg:px-8">
          <span className="text-secondary p-8 text-center">
            No timeline events yet
          </span>
        </div>
      )}
    </div>
  );
}
