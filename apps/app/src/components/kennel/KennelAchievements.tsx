import { Chip } from "@ui/components/chip";
import { Link } from "react-router-dom";

interface TopPet {
  name: string;
  url: string;
}

interface KennelAchievementsProps {
  entity?: any;
  petsCount?: number;
  offspringsCount?: number;
  topPet?: TopPet;
}

// Mock data for development
const MOCK_ACHIEVEMENTS = {
  petsCount: 12,
  offspringsCount: 45,
  topPet: {
    name: "Champion Rex von Haus",
    url: "champion-rex-von-haus",
  },
};

/**
 * KennelAchievements - Displays kennel's achievements as chips
 *
 * Based on Angular: libs/schema/domain/kennel/kennel-achievements/kennel-achievements.component.ts
 * Shows pets count, offsprings count, and top pet as clickable chips
 */
export function KennelAchievements({
  entity,
  petsCount,
  offspringsCount,
  topPet,
}: KennelAchievementsProps) {
  // Extract achievements from entity or use props/mock
  const displayPetsCount = entity?.kennel_pets?.length ?? entity?.pets_count ?? petsCount ?? MOCK_ACHIEVEMENTS.petsCount;
  const displayOffspringsCount = entity?.offspring_pets?.length ?? entity?.offsprings_count ?? offspringsCount ?? MOCK_ACHIEVEMENTS.offspringsCount;
  const displayTopPet = entity?.top_pet || entity?.achievements?.top_pet || topPet || MOCK_ACHIEVEMENTS.topPet;

  // Check if we have any achievements to display
  const hasAnyAchievement = displayPetsCount > 0 || displayOffspringsCount > 0 || displayTopPet;

  // Don't render if no achievements
  if (!hasAnyAchievement) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2 min-h-[2rem]">
      {/* Pets in kennel - links to #pets tab */}
      {displayPetsCount > 0 && (
        <Link to="#pets" className="no-underline">
          <Chip
            label={`Pets in kennel - ${displayPetsCount}`}
            variant="primary"
            className="cursor-pointer hover:opacity-90 transition-opacity"
          />
        </Link>
      )}

      {/* Offsprings - links to #offsprings tab */}
      {displayOffspringsCount > 0 && (
        <Link to="#offsprings" className="no-underline">
          <Chip
            label={`Offsprings - ${displayOffspringsCount}`}
            variant="primary"
            className="cursor-pointer hover:opacity-90 transition-opacity"
          />
        </Link>
      )}

      {/* Top pet - links to pet page */}
      {displayTopPet && (
        <Link to={`/${displayTopPet.url}`} className="no-underline">
          <Chip
            label={`Top pet - ${displayTopPet.name}`}
            variant="primary"
            className="cursor-pointer hover:opacity-90 transition-opacity max-w-80 sm:max-w-120"
          />
        </Link>
      )}
    </div>
  );
}
