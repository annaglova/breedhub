import { PetSexMark } from "@/components/shared/PetSexMark";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { useCollectionValue } from "@/hooks/useCollectionValue";
import { useDictionaryValue } from "@/hooks/useDictionaryValue";
import { NoteFlagButton } from "@ui/components/note-flag-button";
import { Link } from "react-router-dom";

interface PetNameProps {
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

/**
 * PetName - Displays pet name and details
 *
 * Based on Angular: libs/schema/domain/pet/lib/pet-name/pet-name.component.ts
 * Shows: breed link, pet name, verification status, sex, pet status, DOB, COI
 */
export function PetName({
  entity,
  hasNotes = false,
  onNotesClick,
  linkToFullscreen = true,
}: PetNameProps) {
  // Resolve IDs to values via dictionary lookup
  const petStatusName = useDictionaryValue("pet_status", entity?.pet_status_id);
  const sexCode = useDictionaryValue("sex", entity?.sex_id, "code");

  // Get breed data from collection by breed_id
  const breed = useCollectionValue<{ name?: string; slug?: string }>(
    "breed",
    entity?.breed_id
  );

  // Extract data from entity
  const displayName = entity?.name || "Unknown Pet";
  const breedName = entity?.breed?.name || entity?.breed_name || breed?.name;
  const breedSlug = entity?.breed?.slug || entity?.breed_slug || breed?.slug;
  const dateOfBirth = formatDate(entity?.date_of_birth);
  const coi = entity?.coi;

  return (
    <div className="pb-3 cursor-default">
      {/* Breed link - same position as support level in BreedName */}
      {breedName && (
        <div className="text-md mb-2">
          {breedSlug ? (
            <Link to={`/${breedSlug}`} className="uppercase hover:underline">
              {breedName}
            </Link>
          ) : (
            <span className="uppercase">{breedName}</span>
          )}
        </div>
      )}

      {/* Pet name with verification and note flag */}
      <div className="flex space-x-1.5">
        <div className="truncate py-0.5 text-3xl font-bold">
          {linkToFullscreen && entity?.slug ? (
            <Link
              to={`/${entity.slug}`}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              {displayName}
            </Link>
          ) : (
            <span className="cursor-default">{displayName}</span>
          )}
        </div>

        {/* Verification badge */}
        <VerificationBadge
          status={entity?.verification_status_id}
          size={16}
          mode="page"
        />

        {/* Note flag */}
        <NoteFlagButton
          hasNotes={hasNotes}
          onClick={onNotesClick}
          mode="page"
          className="self-start"
        />
      </div>

      {/* Additional info: sex, status, DOB, COI */}
      <div className="flex items-center">
        <div className="text-secondary flex flex-wrap items-center space-x-2 ">
          {/* Sex mark (round style) */}
          <PetSexMark sex={sexCode as any} style="round" className="shrink-0" />

          {/* Pet status */}
          {petStatusName && (
            <div className="flex items-center">
              <span>{petStatusName}</span>
            </div>
          )}

          {/* Date of birth */}
          {dateOfBirth && (
            <div className="flex items-center">
              <span className="mr-2">&bull;</span>
              <span>{dateOfBirth}</span>
            </div>
          )}

          {/* COI - hidden on mobile */}
          {coi !== undefined && coi !== null && (
            <div className="hidden sm:flex items-center">
              <span className="mr-2">&bull;</span>
              <span>COI - {Number(coi).toFixed(2)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
