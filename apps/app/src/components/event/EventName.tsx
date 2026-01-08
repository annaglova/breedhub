import { NoteFlagButton } from "@ui/components/note-flag-button";
import { Link } from "react-router-dom";

// Country reference
interface EventCountry {
  id?: string;
  name: string;
}

// Status reference
interface EventStatus {
  id?: string;
  name?: string;
}

interface EventNameProps {
  entity?: any;
  hasNotes?: boolean;
  onNotesClick?: () => void;
  /** If true, clicking on name navigates to fullscreen page */
  linkToFullscreen?: boolean;
}

// Mock data for visual development
const MOCK_EVENT = {
  name: "World Dog Show 2025",
  slug: "world-dog-show-2025",
  country: { id: "de", name: "Germany" } as EventCountry,
  startDate: "2025-10-15",
  status: { id: "1", name: "Upcoming" } as EventStatus,
  hasNotes: true,
};

/**
 * Format date to locale string
 */
function formatDate(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * EventName - Displays event name and details
 *
 * Based on Angular: libs/schema/domain/event/lib/event-name/event-name.component.ts
 * Shows: country, event name with note flag, start date, status
 */
export function EventName({
  entity,
  hasNotes = false,
  onNotesClick,
  linkToFullscreen = true,
}: EventNameProps) {
  // Use entity data or fallback to mock for development
  const event = entity || MOCK_EVENT;

  // Extract data - support both camelCase and snake_case
  const displayName = event.name || event.Name || "Unknown Event";
  const slug = event.slug || event.Slug || event.url || event.Url;
  const country: EventCountry | undefined =
    event.country || event.Country || MOCK_EVENT.country;
  const startDate =
    event.startDate || event.StartDate || event.start_date || MOCK_EVENT.startDate;
  const status: EventStatus | undefined =
    event.status || event.Status || MOCK_EVENT.status;
  const hasNotesFlag = hasNotes || event.hasNotes || event.HasNotes;

  return (
    <div className="pb-3 cursor-default">
      {/* Country */}
      <div className="text-md mb-3 min-h-[1.5rem] flex flex-wrap space-x-1 uppercase">
        {country?.name && <span>{country.name}</span>}
      </div>

      {/* Event name with note flag */}
      <div className="flex space-x-1.5">
        <div className="truncate py-0.5 text-3xl font-bold">
          {linkToFullscreen && slug ? (
            <Link
              to={`/${slug}`}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              {displayName}
            </Link>
          ) : (
            <span className="cursor-default">{displayName}</span>
          )}
        </div>

        {/* Note flag button */}
        <NoteFlagButton
          hasNotes={hasNotesFlag}
          onClick={onNotesClick}
          mode="page"
          className="self-start pr-7"
        />
      </div>

      {/* Info row: date, status */}
      <div className="flex items-center">
        <div className="text-secondary flex flex-wrap items-center space-x-2 font-medium">
          {/* Color indicator */}
          <div className="bg-primary-300 dark:bg-surface-400 size-4 rounded-full" />

          {/* Start date - no bullet before first item */}
          {startDate && (
            <div className="flex items-center">
              <span>{formatDate(startDate)}</span>
            </div>
          )}

          {/* Status - with bullet before */}
          {status?.name && (
            <div className="flex items-center">
              <span className="mr-2">&bull;</span>
              <span>{status.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
