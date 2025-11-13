import { NoteFlagButton } from "@ui/components/note-flag-button";

interface BreedNameProps {
  entity?: any;
  breedName?: string;
  achievement?: string;
  petProfileCount?: number;
  kennelCount?: number;
  patronCount?: number;
  hasNotes?: boolean;
  onNotesClick?: () => void;
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
}: BreedNameProps) {
  // Extract data from entity if provided
  const displayName = entity?.name || breedName;

  // Achievement from measurements (support level: "Zero support level", "Bronze Supporter", etc.)
  const displayAchievement = entity?.measurements?.achievement || achievement;

  // Measurements from entity.measurements (same as BreedListCard)
  const displayPetCount = entity?.measurements?.pet_profile_count ?? petProfileCount;
  const displayKennelCount = entity?.measurements?.kennel_count ?? kennelCount;
  const displayPatronCount = entity?.measurements?.patron_count ?? patronCount;
  return (
    <div className="pb-3 cursor-default">
      {/* Achievement */}
      <div className="text-md mb-3">
        <span className="uppercase">{displayAchievement}</span>
      </div>

      {/* Breed name with note flag */}
      <div className="flex space-x-1.5">
        <div className="truncate py-0.5 text-3xl font-bold">
          <a href="#">{displayName}</a>
        </div>
        <NoteFlagButton
          hasNotes={hasNotes}
          onClick={onNotesClick}
          mode="page"
          className="pr-7 self-start"
        />
      </div>

      {/* Statistics */}
      <div className="flex items-center">
        <div className="text-primary flex flex-wrap items-center space-x-2 font-medium">
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
