import { Fieldset, InfoRow } from "@/components/shared/InfoRow";
import { PetCard, type Pet } from "@/components/shared/PetCard";
import { ContactBreederTabSkeleton } from "./ContactBreederTabSkeleton";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { useSkeletonWithDelay } from "@/contexts/AboveFoldLoadingContext";
import { enrichPetsWithParents } from "@/utils/pet-enrichment";
import {
  dictionaryStore,
  getPartitionFieldForEntity,
  spaceStore,
  useInfiniteTabData,
  useTabData,
} from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { Calendar, Dog, Home, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SmartLink } from "@/components/shared/SmartLink";

/**
 * Link entity (Kennel, Breed, etc.)
 */
interface LinkEntity {
  id?: string;
  name: string;
  url?: string;
  slug?: string;
}

/**
 * Kennel with breeds and grouped offspring
 */
interface KennelGroup {
  id: string;
  accountId: string;
  accountName: string;
  accountSlug: string;
  accountAvatarUrl: string;
  since: string | null;
  isPrimary: boolean;
  breeds: LinkEntity[];
  offspring: Pet[];
}

/**
 * EntityLink - Renders a link to an entity or plain text
 */
function EntityLink({
  entity,
  entityRole,
}: {
  entity?: LinkEntity;
  entityRole?: string;
}) {
  if (!entity) return <span className="text-muted-foreground">—</span>;

  const url = entity.slug ? `/${entity.slug}` : entity.url;

  if (url) {
    if (entityRole === "kennel") {
      return (
        <SmartLink to={url}>
          {entity.name}
        </SmartLink>
      );
    }
    return (
      <SmartLink to={url} className={entityRole === "breed" ? "text-breed hover:text-primary" : undefined}>
        {entity.name}
      </SmartLink>
    );
  }

  return <span>{entity.name}</span>;
}

/**
 * BreedLinks - Renders list of breed links with bullets
 */
function BreedLinks({ breeds }: { breeds?: LinkEntity[] }) {
  if (!breeds || breeds.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap space-x-1">
      <EntityLink entity={breeds[0]} entityRole="breed" />
      {breeds.slice(1).map((breed) => (
        <div key={breed.id || breed.name} className="flex space-x-1">
          <span className="text-secondary-400">&bull;</span>
          <EntityLink entity={breed} entityRole="breed" />
        </div>
      ))}
    </div>
  );
}

/**
 * SectionHeader - Section title with horizontal line
 */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex w-full items-center space-x-2">
      <span className="font-bold text-secondary whitespace-nowrap">{title}</span>
      <div className="bg-secondary-200 h-[1px] w-full"></div>
    </div>
  );
}

interface ContactBreederTabProps {
  onLoadedCount?: (count: number) => void;
  dataSource?: DataSourceConfig[];
}

/**
 * ContactBreederTab - Contact's breeder career information
 *
 * Displays per kennel:
 * 1. Info - Kennel name, Since, Breeds
 * 2. Offspring - Grid of pet cards grouped by kennel
 */
export function ContactBreederTab({ onLoadedCount, dataSource }: ContactBreederTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const contactId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value;
  // Tab fullscreen (TabPageTemplate, /{slug}/{tabSlug}) is the only mode with
  // infinite scroll. Page fullscreen (/{slug}#tabHash) keeps limits — the
  // "All N loaded" hint and infinite-scroll trigger are misleading there.
  const isTabFullscreen = spaceStore.isTabFullscreen.value;

  // dataSource[0] → kennels (always load all — small dataset)
  const {
    data: kennelsRawData,
    isLoading: kennelsLoading,
  } = useTabData({
    parentId: contactId,
    dataSource: dataSource?.[0]!,
    enabled: !!dataSource?.[0] && !!contactId,
  });

  // dataSource[1] → offspring
  // Drawer: load limited set at once
  const drawerOffspring = useTabData({
    parentId: contactId,
    dataSource: dataSource?.[1]!,
    enabled: !!dataSource?.[1] && !!contactId && !isFullscreen,
  });

  // Fullscreen: infinite scroll with pagination
  const infiniteOffspring = useInfiniteTabData({
    parentId: contactId,
    dataSource: dataSource?.[1]!,
    enabled: !!dataSource?.[1] && !!contactId && isFullscreen,
    pageSize: 30,
  });

  const junctionRecords = isFullscreen ? infiniteOffspring.data : drawerOffspring.data;
  const isLoadingJunction = isFullscreen
    ? infiniteOffspring.isLoading
    : drawerOffspring.isLoading;

  // Flatten `additional` fields to top level (RxDB child records wrap fields in additional)
  const kennelsRaw = useMemo(
    () => (kennelsRawData || []).map((r: any) => ({ ...r, ...r.additional })),
    [kennelsRawData]
  );

  // Load full pets + parents via ID-First (junction rows in `offspring_in_contact`
  // store only ids + pet_breed_id partition key — names/parents are resolved here).
  const [enrichedOffspring, setEnrichedOffspring] = useState<Pet[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);

  useEffect(() => {
    if (isLoadingJunction || !junctionRecords || junctionRecords.length === 0) {
      setEnrichedOffspring([]);
      return;
    }

    let cancelled = false;

    async function loadAndEnrich() {
      setIsEnriching(true);

      try {
        if (!dictionaryStore.initialized.value) {
          await dictionaryStore.initialize();
        }

        const petRefs = (junctionRecords ?? []).map((record: any) => ({
          petId: record.additional?.pet_id || record.pet_id,
          breedId:
            record.partitionId ||
            record.additional?.pet_breed_id ||
            record.pet_breed_id,
        }));

        const partitionField = getPartitionFieldForEntity("pet");
        if (!partitionField) {
          console.warn(
            "[ContactBreederTab] no partition field configured for pet; skipping load",
          );
          if (!cancelled) setEnrichedOffspring([]);
          return;
        }

        const allPets = await spaceStore.loadEntitiesByPartitionRefs(
          "pet",
          petRefs
            .filter(
              (ref): ref is { petId: string; breedId: string } =>
                !!ref.petId && !!ref.breedId,
            )
            .map((ref) => ({ id: ref.petId, partitionId: ref.breedId })),
          { partitionField },
        );

        const enriched = await enrichPetsWithParents(allPets, partitionField);
        if (!cancelled) setEnrichedOffspring(enriched);
      } catch (err) {
        console.error("[ContactBreederTab] Failed to load offspring:", err);
        if (!cancelled) setEnrichedOffspring([]);
      } finally {
        if (!cancelled) setIsEnriching(false);
      }
    }

    loadAndEnrich();
    return () => {
      cancelled = true;
    };
  }, [junctionRecords, isLoadingJunction]);

  // Group enriched offspring by kennel via breed_id → account_id map.
  const kennelGroups = useMemo<KennelGroup[]>(() => {
    if (!kennelsRaw?.length) return [];

    const breedToAccount = new Map<string, string>();
    for (const kennel of kennelsRaw) {
      const breeds =
        (kennel.breeds as Array<{ id: string; name: string; slug: string }>) ||
        [];
      for (const breed of breeds) {
        breedToAccount.set(breed.id, kennel.account_id);
      }
    }

    const offspringByAccount = new Map<string, Pet[]>();
    const ungrouped: Pet[] = [];

    for (const pet of enrichedOffspring) {
      const breedId = pet.breed?.id;
      const accountId = breedId ? breedToAccount.get(breedId) : null;
      if (accountId) {
        if (!offspringByAccount.has(accountId)) {
          offspringByAccount.set(accountId, []);
        }
        offspringByAccount.get(accountId)!.push(pet);
      } else {
        ungrouped.push(pet);
      }
    }

    const groups: KennelGroup[] = kennelsRaw.map((kennel: any) => ({
      id: kennel.id,
      accountId: kennel.account_id,
      accountName: kennel.account_name,
      accountSlug: kennel.account_slug,
      accountAvatarUrl: kennel.account_avatar_url,
      since: kennel.since,
      isPrimary: kennel.is_primary,
      breeds: (
        (kennel.breeds as Array<{ id: string; name: string; slug: string }>) ||
        []
      ).map((b) => ({ id: b.id, name: b.name, slug: b.slug })),
      offspring: offspringByAccount.get(kennel.account_id) || [],
    }));

    if (ungrouped.length > 0) {
      groups.push({
        id: "other",
        accountId: "other",
        accountName: "Other",
        accountSlug: "",
        accountAvatarUrl: "",
        since: null,
        isPrimary: false,
        breeds: [],
        offspring: ungrouped,
      });
    }

    return groups;
  }, [kennelsRaw, enrichedOffspring]);

  // Total offspring count
  const totalOffspring = useMemo(
    () => kennelGroups.reduce((sum, g) => sum + g.offspring.length, 0),
    [kennelGroups]
  );

  // Infinite scroll refs and handlers
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { hasMore, isLoadingMore, loadMore } = infiniteOffspring;

  const handleLoadMore = useCallback(() => {
    if (isFullscreen && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [isFullscreen, hasMore, isLoadingMore, loadMore]);

  // Report loaded count
  useEffect(() => {
    if (onLoadedCount) {
      onLoadedCount(totalOffspring);
    }
  }, [onLoadedCount, totalOffspring]);

  // IntersectionObserver for infinite scroll in fullscreen
  useEffect(() => {
    if (!isFullscreen || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [isFullscreen, handleLoadMore, hasMore, isLoadingMore, totalOffspring]);

  const isLoading = kennelsLoading || isLoadingJunction || isEnriching;

  // Native column-aware skeleton with shared anti-flash window.
  const showSkeleton = useSkeletonWithDelay(isLoading);
  if (showSkeleton) {
    return <ContactBreederTabSkeleton isFullscreen={isFullscreen} />;
  }

  if (!kennelGroups.length) {
    return (
      <span className="text-secondary p-8 text-center block">
        No breeder data
      </span>
    );
  }

  const iconSize = 16;

  return (
    <div className="flex flex-col space-y-5 cursor-default">
      {kennelGroups.map((kennel) => (
        <div key={kennel.id} className="flex flex-col space-y-4">
          <Fieldset legend={kennel.accountName}>
            <div className="grid grid-cols-[16px_50px_1fr] sm:grid-cols-[22px_60px_1fr] items-center gap-3 px-4 pb-2">
              <InfoRow icon={<Home size={iconSize} />} label="Kennel">
                <EntityLink
                  entity={{
                    name: kennel.accountName,
                    slug: kennel.accountSlug || undefined,
                  }}
                  entityRole="kennel"
                />
              </InfoRow>
              <InfoRow icon={<Calendar size={iconSize} />} label="Since">
                <span>
                  {kennel.since
                    ? new Date(kennel.since).getFullYear()
                    : "—"}
                </span>
              </InfoRow>
              <InfoRow icon={<Dog size={iconSize} />} label="Breeds">
                <BreedLinks breeds={kennel.breeds} />
              </InfoRow>
            </div>
          </Fieldset>

          <SectionHeader title="Offspring" />

          {kennel.offspring.length > 0 ? (
            <div
              className={cn(
                "grid gap-3 sm:grid-cols-2",
                isFullscreen && "lg:grid-cols-3 xxl:grid-cols-4"
              )}
            >
              {kennel.offspring.map((pet) => (
                <PetCard key={pet.id} pet={pet} mode="default" />
              ))}
            </div>
          ) : (
            <span className="text-secondary p-8 text-center block">
              No offspring data available
            </span>
          )}
        </div>
      ))}

      {/* Infinite scroll trigger & loading indicator — tab fullscreen only */}
      {isTabFullscreen && (
        <div ref={loadMoreRef} className="py-4 flex justify-center">
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more...</span>
            </div>
          )}
          {!hasMore && totalOffspring > 0 && (
            <span className="text-muted-foreground text-sm">
              All {totalOffspring} offspring loaded
            </span>
          )}
        </div>
      )}
    </div>
  );
}
