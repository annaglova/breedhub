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
 * - breeds: useCollectionValue by father_breed_id and mother_breed_id
 *   - Same breed → show one
 *   - Different breeds → show both with "×" (e.g., cross-breeding dachshunds)
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

  // Get father breed data from collection (enrichment pattern)
  const fatherBreed = useCollectionValue<{ name?: string; slug?: string }>(
    "breed",
    entity?.father_breed_id
  );

  // Get mother breed data from collection (enrichment pattern)
  // Only fetch if different from father's breed
  const motherBreed = useCollectionValue<{ name?: string; slug?: string }>(
    "breed",
    entity?.mother_breed_id !== entity?.father_breed_id ? entity?.mother_breed_id : undefined
  );

  // Get kennel (account) data from collection by kennel_id (enrichment pattern)
  const kennel = useCollectionValue<{ name?: string }>(
    "account",
    entity?.kennel_id
  );

  // Extract data from entity
  const displayName = entity?.name || "Unknown Litter";
  const slug = entity?.slug;

  // Breeds: same → one, different → both with "×"
  const fatherBreedName = fatherBreed?.name;
  const fatherBreedSlug = fatherBreed?.slug;
  const motherBreedName = motherBreed?.name;
  const motherBreedSlug = motherBreed?.slug;
  const isCrossBreed = entity?.father_breed_id !== entity?.mother_breed_id && motherBreedName;

  // Kennel from enrichment with fallback (including VIEW field)
  const kennelName = entity?.kennel?.name || entity?.kennel_name || kennel?.name;

  // Notes flag
  const hasNotesFlag = hasNotes || !!entity?.notes;

  return (
    <div className="pb-3 cursor-default">
      {/* Breed section: same breed → one, different → both with × */}
      <div className="text-md mb-3 min-h-[1.5rem] flex flex-wrap items-center space-x-1">
        {fatherBreedName && (
          <EntityLink name={fatherBreedName} slug={fatherBreedSlug} className="uppercase" />
        )}
        {isCrossBreed && (
          <>
            <span className="text-secondary">×</span>
            <EntityLink name={motherBreedName} slug={motherBreedSlug} className="uppercase" />
          </>
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
