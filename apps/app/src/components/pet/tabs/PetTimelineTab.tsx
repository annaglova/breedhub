import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { AlternatingTimeline } from "@ui/components/timeline";
import { Cake, Trophy, Baby, HeartOff, Info } from "lucide-react";
import { useMemo } from "react";

/**
 * Timeline event type IDs from database
 */
const EVENT_TYPES = {
  BIRTHDAY: "52de412c-be03-42fb-861d-62bda67a9745",
  SHOW: "de388cd8-05be-47ee-bcce-55bbe7fc6ca8",
  LITTER: "5b23dcaf-2b4d-44c8-ada7-7b0077975a7c",
  DEATH: "62c2cad4-9fcf-4c75-b8ef-dcf9d44f346f",
} as const;

/**
 * Timeline event from API
 */
interface TimelineEvent {
  Id: string;
  Name: string;
  Date: string;
  Text?: string;
  Type: {
    Id: string;
    Name: string;
  };
}

// Mock data for visual development
const MOCK_TIMELINE: TimelineEvent[] = [
  {
    Id: "1",
    Name: "Born",
    Date: "May 15, 2021",
    Text: "Champion Max vom Königsberg was born in Berlin, Germany",
    Type: {
      Id: EVENT_TYPES.BIRTHDAY,
      Name: "Birthday",
    },
  },
  {
    Id: "2",
    Name: "First Show Win",
    Date: "October 8, 2022",
    Text: "Best of Breed at the Berlin Dog Show 2022",
    Type: {
      Id: EVENT_TYPES.SHOW,
      Name: "Show",
    },
  },
  {
    Id: "3",
    Name: "Champion Title",
    Date: "March 20, 2023",
    Text: "Achieved German Champion title after winning at Crufts qualifier",
    Type: {
      Id: EVENT_TYPES.SHOW,
      Name: "Show",
    },
  },
  {
    Id: "4",
    Name: "First Litter",
    Date: "June 5, 2023",
    Text: "Father of 6 beautiful puppies with Beautiful Bella aus Bayern",
    Type: {
      Id: EVENT_TYPES.LITTER,
      Name: "Litter",
    },
  },
];

/**
 * Get icon for event type
 */
function getEventIcon(typeId: string) {
  switch (typeId) {
    case EVENT_TYPES.BIRTHDAY:
      return <Cake className="h-4 w-4" />;
    case EVENT_TYPES.SHOW:
      return <Trophy className="h-4 w-4" />;
    case EVENT_TYPES.LITTER:
      return <Baby className="h-4 w-4" />;
    case EVENT_TYPES.DEATH:
      return <HeartOff className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
}

/**
 * Get dot variant for event type
 */
function getEventVariant(typeId: string): "primary" | "success" | "default" | "inactive" {
  switch (typeId) {
    case EVENT_TYPES.BIRTHDAY:
      return "success";
    case EVENT_TYPES.SHOW:
      return "primary";
    case EVENT_TYPES.LITTER:
      return "primary";
    case EVENT_TYPES.DEATH:
      return "default";
    default:
      return "inactive";
  }
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
 * Based on Angular: pet-timeline.component.ts
 */
export function PetTimelineTab({ onLoadedCount }: PetTimelineTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;

  // TODO: Load real data from entity.Timeline
  // For now using mock data
  const timeline = MOCK_TIMELINE;

  // Convert timeline events to AlternatingTimeline format
  const timelineItems = useMemo(() => {
    const items = timeline.map((event) => ({
      id: event.Id,
      title: event.Name,
      description: event.Text,
      date: event.Date,
      icon: getEventIcon(event.Type.Id),
      variant: getEventVariant(event.Type.Id),
    }));

    // Add "Coming soon" placeholder at the end
    items.push({
      id: "coming-soon",
      title: "More exciting events to come",
      description: "Special events from your pet's life will be displayed here",
      date: "Coming soon",
      icon: <Info className="h-4 w-4" />,
      variant: "inactive" as const,
    });

    return items;
  }, [timeline]);

  return (
    <div className="px-6 cursor-default">
      {timelineItems.length > 1 ? (
        <AlternatingTimeline
          items={timelineItems}
          layout={isFullscreen ? "alternating" : "right"}
          showCards={true}
          connectorVariant="primary"
        />
      ) : (
        <div className="card flex flex-auto flex-col p-6 lg:px-8">
          <span className="text-secondary p-8 text-center font-medium">
            No timeline events yet
          </span>
        </div>
      )}
    </div>
  );
}
