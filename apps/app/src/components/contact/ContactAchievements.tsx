import { Chip } from "@ui/components/chip";
import { Link } from "react-router-dom";

interface LinkedEntity {
  name: string;
  url?: string;
  slug?: string;
}

interface ContactAchievementsProps {
  entity?: any;
  kennel?: LinkedEntity;
  topPet?: LinkedEntity;
}

// Mock data for development
const MOCK_ACHIEVEMENTS = {
  kennel: {
    name: "Haus Wunderbar",
    slug: "haus-wunderbar",
  },
  topPet: {
    name: "Champion Rex von Haus",
    slug: "champion-rex-von-haus",
  },
};

/**
 * ContactAchievements - Displays contact's achievements as chips
 *
 * Shows kennel ownership and top pet as clickable chips
 */
export function ContactAchievements({
  entity,
  kennel,
  topPet,
}: ContactAchievementsProps) {
  // Extract achievements from entity, props, or use mock as fallback
  // Always fallback to mock if specific field is missing
  const displayKennel = entity?.kennel || entity?.Kennel || kennel || MOCK_ACHIEVEMENTS.kennel;
  const displayTopPet = entity?.top_pet || entity?.topPet || entity?.TopPet || topPet || MOCK_ACHIEVEMENTS.topPet;

  // Get URLs
  const kennelUrl = displayKennel?.slug || displayKennel?.url;
  const topPetUrl = displayTopPet?.slug || displayTopPet?.url;

  // Check if we have any achievements to display
  const hasAnyAchievement = displayKennel || displayTopPet;

  // Don't render if no achievements
  if (!hasAnyAchievement) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2 min-h-[2rem]">
      {/* Kennel - links to kennel page */}
      {displayKennel && (
        kennelUrl ? (
          <Link to={`/${kennelUrl}`} className="no-underline">
            <Chip
              label={`Kennel - ${displayKennel.name}`}
              variant="primary"
              className="cursor-pointer hover:opacity-90 transition-opacity max-w-80 sm:max-w-120"
            />
          </Link>
        ) : (
          <Chip
            label={`Kennel - ${displayKennel.name}`}
            variant="primary"
            className="max-w-80 sm:max-w-120"
          />
        )
      )}

      {/* Top pet - links to pet page */}
      {displayTopPet && (
        topPetUrl ? (
          <Link to={`/${topPetUrl}`} className="no-underline">
            <Chip
              label={`Top pet - ${displayTopPet.name}`}
              variant="primary"
              className="cursor-pointer hover:opacity-90 transition-opacity max-w-80 sm:max-w-120"
            />
          </Link>
        ) : (
          <Chip
            label={`Top pet - ${displayTopPet.name}`}
            variant="primary"
            className="max-w-80 sm:max-w-120"
          />
        )
      )}
    </div>
  );
}
