import { Link } from "react-router-dom";
import { NoteFlagButton } from "@ui/components/note-flag-button";
import { VerificationBadge } from "@/components/entity/VerificationBadge";
import { PetSexMark } from "@/components/shared/PetSexMark";
import { useDictionaryValue } from "@/hooks/useDictionaryValue";

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

  // Extract data from entity
  const displayName = entity?.name || "Unknown Pet";
  const breedName = entity?.breed?.name || entity?.breed_name;
  const breedSlug = entity?.breed?.slug || entity?.breed_slug;
  const dateOfBirth = formatDate(entity?.date_of_birth);
  const coi = entity?.coi;

  return (
    <div className="pb-3 cursor-default">
      {/* Breed link */}
      {breedName && (
        <div className="text-md mb-3 max-w-72 sm:max-w-full flex">
          {breedSlug ? (
            <Link
              to={`/${breedSlug}`}
              className="truncate text-primary hover:underline"
            >
              {breedName}
            </Link>
          ) : (
            <span className="truncate">{breedName}</span>
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
          className="self-center"
        />

        {/* Note flag */}
        <NoteFlagButton
          hasNotes={hasNotes}
          onClick={onNotesClick}
          mode="page"
          className="pr-7 self-start"
        />
      </div>

      {/* Additional info: sex, status, DOB, COI */}
      <div className="flex items-center">
        <div className="text-secondary flex flex-wrap items-center space-x-2 font-medium">
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
              <span>COI - {(coi * 100).toFixed(2)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
