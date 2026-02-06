import { NoteFlagButton } from "@ui/components/note-flag-button";
import { Link } from "react-router-dom";
import { useDictionaryValue } from "@/hooks/useDictionaryValue";

interface EventNameProps {
  entity?: any;
  hasNotes?: boolean;
  onNotesClick?: () => void;
  /** If true, clicking on name navigates to fullscreen page */
  linkToFullscreen?: boolean;
}

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
 * EventName - Displays program name and details
 *
 * Shows: country, program name with note flag, start date, status, type
 *
 * Enrichment pattern (like LitterName):
 * - status: useDictionaryValue by status_id → program_status
 * - country: useDictionaryValue by country_id → country (denormalized from event)
 * - type: useDictionaryValue by type_id → program_type
 */
export function EventName({
  entity,
  hasNotes = false,
  onNotesClick,
  linkToFullscreen = true,
}: EventNameProps) {
  // Resolve FK fields via dictionary lookup (enrichment pattern)
  // All fields from program (country_id denormalized from event)
  const statusName = useDictionaryValue("program_status", entity?.status_id);
  const countryName = useDictionaryValue("country", entity?.country_id);
  const typeName = useDictionaryValue("program_type", entity?.type_id);

  // Extract data from entity (program)
  const displayName = entity?.name || "Unknown Program";
  const slug = entity?.slug;
  const startDate = entity?.start_date;
  const hasNotesFlag = hasNotes || !!entity?.notes;

  return (
    <div className="pb-3 cursor-default">
      {/* Country and Type */}
      <div className="text-md mb-3 min-h-[1.5rem] flex flex-wrap items-center space-x-1 uppercase">
        {countryName && <span>{countryName}</span>}
        {countryName && typeName && <span className="text-secondary">•</span>}
        {typeName && <span>{typeName}</span>}
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
          {statusName && (
            <div className="flex items-center">
              {startDate && <span className="mr-2">&bull;</span>}
              <span>{statusName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
