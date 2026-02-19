import { dictionaryStore } from "@breedhub/rxdb-store";
import { Chip } from "@ui/components/chip";
import { useEffect, useState } from "react";
import { SmartLink } from "@/components/shared/SmartLink";

interface EnrichedEntity {
  id: string;
  name: string;
  slug?: string;
}

interface ContactAchievementsProps {
  entity?: any;
}

/**
 * ContactAchievements - Displays contact's achievements as chips
 *
 * Reads kennels[] and top_pets[] ID arrays from entity,
 * enriches with name/slug via dictionaryStore, renders as clickable chips.
 */
export function ContactAchievements({
  entity,
}: ContactAchievementsProps) {
  const [kennels, setKennels] = useState<EnrichedEntity[]>([]);
  const [topPets, setTopPets] = useState<EnrichedEntity[]>([]);

  const kennelIds = entity?.kennels as { id: string }[] | undefined;
  const topPetIds = entity?.top_pets as { id: string; breed_id: string }[] | undefined;
  const entityId = entity?.id;

  // Enrich kennels
  useEffect(() => {
    if (!kennelIds?.length) {
      setKennels([]);
      return;
    }

    let isMounted = true;

    async function loadKennels() {
      const results = await Promise.all(
        kennelIds!.map(async (k) => {
          const record = await dictionaryStore.getRecordById("account", k.id);
          return record ? { id: k.id, name: record.name as string, slug: record.slug as string } : null;
        })
      );
      if (isMounted) {
        setKennels(results.filter((r): r is EnrichedEntity => r !== null));
      }
    }

    loadKennels();
    return () => { isMounted = false; };
  }, [entityId]);

  // Enrich top pets
  useEffect(() => {
    if (!topPetIds?.length) {
      setTopPets([]);
      return;
    }

    let isMounted = true;

    async function loadTopPets() {
      const results = await Promise.all(
        topPetIds!.map(async (tp) => {
          const record = await dictionaryStore.getRecordById("pet", tp.id);
          return record ? { id: tp.id, name: record.name as string, slug: record.slug as string } : null;
        })
      );
      if (isMounted) {
        setTopPets(results.filter((r): r is EnrichedEntity => r !== null));
      }
    }

    loadTopPets();
    return () => { isMounted = false; };
  }, [entityId]);

  const hasAny = kennels.length > 0 || topPets.length > 0;

  if (!hasAny) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2 min-h-[2rem]">
      {/* Kennels */}
      {kennels.map((kennel) => (
        kennel.slug ? (
          <SmartLink
            key={kennel.id}
            to={`/${kennel.slug}`}
            entityType="kennel"
            entityId={kennel.id}
            showTooltip={false}
            className="no-underline"
          >
            <Chip
              label={`Kennel - ${kennel.name}`}
              variant="primary"
              className="cursor-pointer hover:opacity-90 transition-opacity max-w-80 sm:max-w-120"
            />
          </SmartLink>
        ) : (
          <Chip
            key={kennel.id}
            label={`Kennel - ${kennel.name}`}
            variant="primary"
            className="max-w-80 sm:max-w-120"
          />
        )
      ))}

      {/* Top pets */}
      {topPets.map((pet) => (
        pet.slug ? (
          <SmartLink
            key={pet.id}
            to={`/${pet.slug}`}
            entityType="pet"
            entityId={pet.id}
            showTooltip={false}
            className="no-underline"
          >
            <Chip
              label={`Top pet - ${pet.name}`}
              variant="primary"
              className="cursor-pointer hover:opacity-90 transition-opacity max-w-80 sm:max-w-120"
            />
          </SmartLink>
        ) : (
          <Chip
            key={pet.id}
            label={`Top pet - ${pet.name}`}
            variant="primary"
            className="max-w-80 sm:max-w-120"
          />
        )
      ))}
    </div>
  );
}
