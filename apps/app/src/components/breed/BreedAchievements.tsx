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

  const hasAnyAchievement = displayTopKennel || displayMajorPatron || displayTopPet;

  // Inactive chip — single muted-italic pill that previews what slots will
  // surface here once the breed has any achievements. Shown only when ALL
  // three are empty (so we don't sprinkle three gray TBD pills next to a
  // single real one).
  const placeholderClass =
    "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 italic font-normal";

  return (
    <div className="flex flex-wrap gap-2 mt-2 min-h-[2rem]">
      {hasAnyAchievement ? (
        <>
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
        </>
      ) : (
        <Chip
          label="Top kennel · Major patron · Top pet"
          variant="default"
          className={placeholderClass}
        />
      )}
    </div>
  );
}
