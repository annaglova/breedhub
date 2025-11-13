import { Chip } from "@ui/components/chip";

interface Achievement {
  name: string;
  url: string;
}

interface BreedAchievementsProps {
  entity?: any;
  topKennel?: Achievement;
  majorPatron?: Achievement;
  topPet?: Achievement;
}

/**
 * BreedAchievements - Displays breed's top achievements as chips
 *
 * EXACT COPY from Angular: libs/schema/domain/breed/lib/breed-achievements/breed-achievements.component.ts
 * Shows top kennel, major patron, and top pet as clickable chips
 */
export function BreedAchievements({
  entity,
  topKennel,
  majorPatron,
  topPet,
}: BreedAchievementsProps) {
  // Extract achievements from entity.achievements JSONB field
  const displayTopKennel = entity?.achievements?.top_kennel || topKennel;
  const displayMajorPatron = entity?.achievements?.major_patron || majorPatron;
  const displayTopPet = entity?.achievements?.top_pet || topPet;
  return (
    <div className="flex flex-wrap gap-2 font-medium mt-3">
      {displayTopKennel && (
        <a href={`/${displayTopKennel.url}`} className="no-underline">
          <Chip
            label={`Top kennel - ${displayTopKennel.name}`}
            variant="primary"
            className="cursor-pointer hover:opacity-90 transition-opacity"
          />
        </a>
      )}

      {displayMajorPatron && (
        <a href={`/${displayMajorPatron.url}`} className="no-underline">
          <Chip
            label={`Major patron - ${displayMajorPatron.name}`}
            variant="primary"
            className="cursor-pointer hover:opacity-90 transition-opacity max-w-80 sm:max-w-120"
          />
        </a>
      )}

      {displayTopPet && (
        <a href={`/${displayTopPet.url}`} className="no-underline">
          <Chip
            label={`Top pet - ${displayTopPet.name}`}
            variant="primary"
            className="cursor-pointer hover:opacity-90 transition-opacity max-w-80 sm:max-w-120"
          />
        </a>
      )}
    </div>
  );
}
