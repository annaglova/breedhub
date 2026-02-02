import { NoteFlagButton } from "@ui/components/note-flag-button";
import { Link } from "react-router-dom";
import { useCollectionValue } from "@/hooks/useCollectionValue";
import { useDictionaryValue } from "@/hooks/useDictionaryValue";

interface LitterNameProps {
  entity?: any;
  hasNotes?: boolean;
  onNotesClick?: () => void;
  /** If true, clicking on name navigates to fullscreen page */
  linkToFullscreen?: boolean;
}

/**
 * EntityLink - Renders a link to an entity or plain text
 */
function EntityLink({
  name,
  slug,
  className = "",
}: {
  name?: string;
  slug?: string;
  className?: string;
}) {
  if (!name) return null;

  if (slug) {
    return (
      <Link to={`/${slug}`} className={`hover:underline ${className}`}>
        {name}
      </Link>
    );
  }

  return <span className={className}>{name}</span>;
}

/**
 * LitterName - Displays litter name and details
 *
 * Enrichment pattern (like PetName):
 * - breed: useCollectionValue by father_breed_id
 * - kennel: useCollectionValue by kennel_id (account table)
 * - status: useDictionaryValue by status_id
 */
export function LitterName({
  entity,
  hasNotes = false,
  onNotesClick,
  linkToFullscreen = true,
}: LitterNameProps) {
  // Resolve status_id to name via dictionary lookup
  const statusName = useDictionaryValue("litter_status", entity?.status_id);

  // Get breed data from collection by father_breed_id (enrichment pattern)
  const breed = useCollectionValue<{ name?: string; slug?: string }>(
    "breed",
    entity?.father_breed_id
  );

  // Get kennel (account) data from collection by kennel_id (enrichment pattern)
  const kennel = useCollectionValue<{ name?: string }>(
    "account",
    entity?.kennel_id
  );

  // Extract data from entity
  const displayName = entity?.name || "Unknown Litter";
  const slug = entity?.slug;

  // Breed from enrichment with fallback (like PetName)
  const breedName = entity?.breed?.name || breed?.name;
  const breedSlug = entity?.breed?.slug || breed?.slug;

  // Kennel from enrichment with fallback
  const kennelName = entity?.kennel?.name || kennel?.name;

  // Notes flag
  const hasNotesFlag = hasNotes || !!entity?.notes;

  return (
    <div className="pb-3 cursor-default">
      {/* Breed section */}
      <div className="text-md mb-3 min-h-[1.5rem] flex flex-wrap items-center space-x-1">
        {breedName && (
          <EntityLink name={breedName} slug={breedSlug} className="uppercase" />
        )}
      </div>

      {/* Litter name with note flag */}
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

      {/* Info row: kennel, status */}
      <div className="flex items-center">
        <div className="text-secondary flex flex-wrap items-center space-x-2 font-medium">
          {/* Color indicator */}
          <div className="bg-primary-300 dark:bg-surface-400 size-4 rounded-full" />

          {/* Kennel - first item, no bullet */}
          {kennelName && (
            <div className="flex items-center">
              <span>{kennelName}</span>
            </div>
          )}

          {/* Status - with bullet before */}
          {statusName && (
            <div className="flex items-center">
              {kennelName && <span className="mr-2">&bull;</span>}
              <span>{statusName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
