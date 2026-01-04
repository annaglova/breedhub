import { EntityListCardWrapper } from "@/components/space/EntityListCardWrapper";
import { NoteFlag } from "@/components/shared/NoteFlag";

// Interface for event data from RxDB/Supabase
interface EventEntity {
  id: string;
  name?: string;
  start_date?: string;
  end_date?: string;
  status_id?: string;
  status_name?: string;
  status?: { name?: string };
  country_id?: string;
  country_name?: string;
  notes?: string;
  has_notes?: boolean;
  [key: string]: any;
}

interface EventListCardProps {
  entity: EventEntity;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * Format date to locale string
 */
function formatDate(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function EventListCard({
  entity,
  selected = false,
  onClick,
}: EventListCardProps) {
  // Mock data for UI development - will be replaced with real data
  const event = {
    Id: entity.id,
    Name: entity.name || "Unknown",
    // StartDate - mock for visual testing (always show)
    StartDate: "2024-03-15",
    // Status - mock for visual testing (always show)
    StatusName: "Upcoming",
    // Notes - mock for visual testing (always show)
    HasNotes: true,
  };

  const formattedDate = formatDate(event.StartDate);

  return (
    <EntityListCardWrapper
      selected={selected}
      onClick={onClick}
      className="h-[68px] relative"
    >
      <div className="flex items-center w-full">
        {/* Details - no avatar for event */}
        <div className="w-full space-y-0.5">
          {/* Name row */}
          <div className="relative flex w-[calc(100vw-82px)] space-x-1 md:w-auto">
            <span className="truncate font-medium" title={event.Name}>
              {event.Name}
            </span>
            <NoteFlag isVisible={event.HasNotes} />
          </div>

          {/* Info row */}
          <div className="flex items-center">
            <div className="text-sm text-slate-600 dark:text-slate-400 flex space-x-1 truncate">
              {/* Start Date */}
              {formattedDate && <span>{formattedDate}</span>}

              {/* Status */}
              {event.StatusName && (
                <>
                  {formattedDate && <span className="text-slate-400">&bull;</span>}
                  <span>{event.StatusName}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </EntityListCardWrapper>
  );
}
