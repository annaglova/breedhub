import { NoteFlagButton } from "@ui/components/note-flag-button";
import { Link } from "react-router-dom";

interface BreedNameProps {
  entity?: any;
  breedName?: string;
  achievement?: string;
  petProfileCount?: number;
  kennelCount?: number;
  patronCount?: number;
  hasNotes?: boolean;
  onNotesClick?: () => void;
  /** If true, clicking on name navigates to fullscreen page */
  linkToFullscreen?: boolean;
}

/**
 * BreedName - Displays breed name and statistics
 *
 * EXACT COPY from Angular: libs/schema/domain/breed/lib/breed-name/breed-name.component.ts
 * Shows achievement, breed name, and count statistics
 */
export function BreedName({
  entity,
  breedName = "German Shepherd",
  achievement = "Best in Show",
  petProfileCount = 1234,
  kennelCount = 56,
  patronCount = 89,
  hasNotes = false,
  onNotesClick,
  linkToFullscreen = true,
}: BreedNameProps) {
  // Extract data from entity if provided
  const displayName = entity?.name || breedName;

  // Support level from support_data (e.g., "Zero support level", "Bronze Supporter", etc.)
  const displayAchievement = entity?.support_data?.label || achievement;

  // Measurements from entity.measurements (same as BreedListCard)
  const displayPetCount =
    entity?.measurements?.pet_profile_count ?? petProfileCount;
  const displayKennelCount = entity?.measurements?.kennel_count ?? kennelCount;
  const displayPatronCount = entity?.measurements?.patron_count ?? patronCount;
  return (
    <div className="pb-3 cursor-default">
      {/* Achievement */}
      <div className="text-md mb-2 min-h-[1.5rem]">
        {displayAchievement && (
          <span className="uppercase">{displayAchievement}</span>
        )}
      </div>

      {/* Breed name with note flag */}
      <div className="flex space-x-1.5">
        <h1 className="truncate py-0.5 text-4xl">
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
        </h1>
        <NoteFlagButton
          hasNotes={hasNotes}
          onClick={onNotesClick}
          mode="page"
          className="self-start"
        />
      </div>

      {/* Statistics */}
      <div className="flex items-center">
        <div className="text-primary flex flex-wrap items-center space-x-2 ">
          {/* Color indicator */}
          <div className="bg-primary-300 dark:bg-surface-400 size-4 rounded-full"></div>

          {/* Pet profiles - no bullet before */}
          <div className="flex items-center">
            <span>Pet profiles - {displayPetCount}</span>
          </div>

          {/* Kennels - with bullet before */}
          <div className="hidden sm:flex items-center">
            <span className="mr-2">&bull;</span>
            <span>Kennels - {displayKennelCount}</span>
          </div>

          {/* Patrons - with bullet before */}
          <div className="flex items-center">
            <span className="mr-2">&bull;</span>
            <span>Patrons - {displayPatronCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
