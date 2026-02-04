import { NoteFlag } from "@/components/shared/NoteFlag";
import { EntityListCardWrapper } from "@/components/space/EntityListCardWrapper";
import { useDictionaryValue } from "@/hooks/useDictionaryValue";

/**
 * Interface for program data from RxDB/Supabase
 * Note: "Events" in UI actually shows Program records, with Event as header
 */
interface ProgramEntity {
  id: string;
  name?: string;
  start_date?: string;
  status_id?: string;
  event_id?: string;
  notes?: string;
  [key: string]: any;
}

interface EventListCardProps {
  entity: ProgramEntity;
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
  // Resolve status_id to name via dictionary lookup (program_status)
  const statusName = useDictionaryValue("program_status", entity.status_id);

  // Extract data from entity - use real DB values
  // Date and Status are from program itself, not from event
  const program = {
    Id: entity.id,
    Name: entity.name || "Unknown",
    StartDate: entity.start_date,
    StatusName: statusName,
    HasNotes: !!entity.notes,
  };

  const formattedDate = formatDate(program.StartDate);

  return (
    <EntityListCardWrapper
      selected={selected}
      onClick={onClick}
      className="h-[68px] relative"
    >
      <div className="flex items-center w-full">
        {/* Details - no avatar for program/event */}
        <div className="w-full space-y-0.5">
          {/* Name row */}
          <div className="relative flex w-[calc(100vw-82px)] space-x-1 md:w-auto">
            <span className="text-md truncate" title={program.Name}>
              {program.Name}
            </span>
            <NoteFlag isVisible={program.HasNotes} />
          </div>

          {/* Info row */}
          <div className="flex items-center">
            <div className="text-sm text-slate-600 dark:text-slate-400 flex space-x-1 truncate">
              {/* Start Date */}
              {formattedDate && <span>{formattedDate}</span>}

              {/* Program Status */}
              {program.StatusName && (
                <>
                  {formattedDate && (
                    <span className="text-slate-400">&bull;</span>
                  )}
                  <span>{program.StatusName}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </EntityListCardWrapper>
  );
}

/**
 * Skeleton for EventListCard - no avatar, just text placeholders
 */
EventListCard.Skeleton = function EventListCardSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-7 h-[68px] animate-pulse border-b border-surface-border">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2" />
      </div>
    </div>
  );
};
