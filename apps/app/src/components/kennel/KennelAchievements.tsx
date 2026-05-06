import { Chip } from "@ui/components/chip";
import { useCollectionValue } from "@/hooks/useCollectionValue";
import { getPartitionFieldForEntity } from "@breedhub/rxdb-store";
import { Link } from "react-router-dom";

const PET_PARTITION_FIELD = getPartitionFieldForEntity("pet");

interface TopPetRef {
  id: string;
  breed_id: string;
}

interface Achievements {
  pets_count?: number;
  offsprings_count?: number;
  top_pet?: TopPetRef;
}

interface KennelAchievementsProps {
  entity?: {
    achievements?: Achievements;
    [key: string]: any;
  };
}

/**
 * KennelAchievements - Displays kennel's achievements as chips
 *
 * Data sources:
 * - pets_count, offsprings_count: from entity.achievements (denormalized)
 * - top_pet: enriched via useCollectionValue by id + breed_id (partitioned)
 */
export function KennelAchievements({
  entity,
}: KennelAchievementsProps) {
  const achievements = entity?.achievements;
  const petsCount = achievements?.pets_count || 0;
  const offspringsCount = achievements?.offsprings_count || 0;
  const topPetRef = achievements?.top_pet;

  // Enrich top pet from partitioned pet collection
  const topPet = useCollectionValue<{ name?: string; slug?: string }>(
    topPetRef ? 'pet' : undefined,
    topPetRef?.id,
    {
      partitionKey: PET_PARTITION_FIELD
        ? { field: PET_PARTITION_FIELD, value: topPetRef?.breed_id }
        : undefined,
    }
  );

  const hasAnyAchievement = petsCount > 0 || offspringsCount > 0 || topPet?.name;

  // Inactive chip — single muted-italic pill that previews what slots will
  // surface here once the kennel earns any achievements. Shown only when
  // ALL slots are empty.
  const placeholderClass =
    "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 italic font-normal";

  return (
    <div className="flex flex-wrap gap-2 mt-2 min-h-[2rem]">
      {hasAnyAchievement ? (
        <>
          {petsCount > 0 && (
            <Link to="#pets" className="no-underline">
              <Chip
                label={`Pets in kennel - ${petsCount}`}
                variant="primary"
                className="cursor-pointer hover:opacity-90 transition-opacity"
              />
            </Link>
          )}

          {offspringsCount > 0 && (
            <Link to="#offsprings" className="no-underline">
              <Chip
                label={`Offsprings - ${offspringsCount}`}
                variant="primary"
                className="cursor-pointer hover:opacity-90 transition-opacity"
              />
            </Link>
          )}

          {topPet?.name && (
            <Link to={`/${topPet.slug || ''}`} className="no-underline">
              <Chip
                label={`Top pet - ${topPet.name}`}
                variant="primary"
                className="cursor-pointer hover:opacity-90 transition-opacity max-w-80 sm:max-w-120"
              />
            </Link>
          )}
        </>
      ) : (
        <Chip
          label="Pets in kennel · Offsprings · Top pet"
          variant="default"
          className={placeholderClass}
        />
      )}
    </div>
  );
}
