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

  // Check if we have any achievements
  const hasAnyAchievement = displayTopKennel || displayMajorPatron || displayTopPet;

  // Show skeleton while entity exists but achievements might be loading
  // (entity present but achievements field is undefined - could be loading)
  if (entity && entity.achievements === undefined) {
    return (
      <div className="flex flex-wrap gap-2 mt-2 min-h-[2rem]">
        <div className="h-7 w-32 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
        <div className="h-7 w-28 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
      </div>
    );
  }

  // Don't render if no achievements
  if (!hasAnyAchievement) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2 min-h-[2rem]">
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
