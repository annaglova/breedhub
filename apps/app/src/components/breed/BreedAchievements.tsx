import { Chip } from "@ui/components/chip";

interface Achievement {
  name: string;
  url: string;
}

interface BreedAchievementsProps {
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
  topKennel,
  majorPatron,
  topPet,
}: BreedAchievementsProps) {
  return (
    <div className="flex flex-wrap gap-2 font-medium mb-6 mt-3">
      {topKennel && (
        <a href={`/${topKennel.url}`} className="no-underline">
          <Chip
            label={`Top kennel - ${topKennel.name}`}
            variant="primary"
            className="cursor-pointer hover:opacity-90 transition-opacity"
          />
        </a>
      )}

      {majorPatron && (
        <a href={`/${majorPatron.url}`} className="no-underline">
          <Chip
            label={`Major patron - ${majorPatron.name}`}
            variant="primary"
            className="cursor-pointer hover:opacity-90 transition-opacity max-w-80 sm:max-w-120"
          />
        </a>
      )}

      {topPet && (
        <a href={`/${topPet.url}`} className="no-underline">
          <Chip
            label={`Top pet - ${topPet.name}`}
            variant="primary"
            className="cursor-pointer hover:opacity-90 transition-opacity max-w-80 sm:max-w-120"
          />
        </a>
      )}
    </div>
  );
}
