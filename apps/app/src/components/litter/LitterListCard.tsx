import { NoteFlag } from "@/components/shared/NoteFlag";
import { PetServices } from "@/components/shared/PetServices";
import { TierMark } from "@/components/shared/TierMark";
import { EntityListCardWrapper } from "@/components/space/EntityListCardWrapper";
import { useCollectionValue } from "@/hooks/useCollectionValue";
import { useDictionaryValue } from "@/hooks/useDictionaryValue";

// Tier marks format from DB
interface TierMarkEntry {
  contact_name?: string;
  product_name?: string;
}

interface TierMarksData {
  owner?: TierMarkEntry;
  breeder?: TierMarkEntry;
}

// Interface for litter data from RxDB (base table, enriched via hooks)
interface LitterEntity {
  id: string;
  name?: string;
  notes?: string;
  status_id?: string;
  kennel_id?: string;
  father_id?: string;
  father_breed_id?: string; // For partition pruning when fetching father
  mother_id?: string;
  mother_breed_id?: string; // For partition pruning when fetching mother
  date_of_birth?: string;
  tier_marks?: TierMarksData;
  services?: string[] | Record<string, string>; // New: ["id", ...], Legacy: {"1": "id", ...}
  [key: string]: any;
}

interface LitterListCardProps {
  entity: LitterEntity;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * Format date to locale string
 */
function formatDate(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function LitterListCard({
  entity,
  selected = false,
  onClick,
}: LitterListCardProps) {
  // Resolve status_id to name via dictionary lookup
  const statusName = useDictionaryValue("litter_status", entity.status_id);

  // Enrichment via hooks (instead of VIEW for better performance)
  // Pet is partitioned by breed_id, so we pass it for efficient partition pruning
  const father = useCollectionValue<{ name?: string }>("pet", entity.father_id, {
    partitionKey: { field: "breed_id", value: entity.father_breed_id },
  });
  const mother = useCollectionValue<{ name?: string }>("pet", entity.mother_id, {
    partitionKey: { field: "breed_id", value: entity.mother_breed_id },
  });
  const kennel = useCollectionValue<{ name?: string }>("account", entity.kennel_id);

  // Extract data from entity - enriched via hooks
  const litter = {
    Id: entity.id,
    Name: entity.name || "Unknown",
    // Father and Mother - enriched via useCollectionValue
    FatherName: father?.name || "",
    MotherName: mother?.name || "",
    // Status - resolved from dictionary
    Status: statusName,
    // Kennel - enriched via useCollectionValue
    KennelName: kennel?.name,
    // Dates
    DateOfBirth: entity.date_of_birth,
    // Notes - uses real data from entity
    HasNotes: !!entity.notes,
    // Tier marks - uses real data from entity
    TierMarks: entity.tier_marks,
    // Services - uses real data from entity
    Services: entity.services,
  };

  const formattedDate = formatDate(litter.DateOfBirth);

  return (
    <EntityListCardWrapper
      selected={selected}
      onClick={onClick}
      className="h-[68px] relative"
    >
      <div className="flex items-center w-full">
        {/* Details - no avatar for litter */}
        <div className="w-full">
          {/* Father row */}
          <div className="relative flex w-[calc(100vw-82px)] items-center space-x-1.5 md:w-auto">
            <div className="size-2 rounded-full bg-blue-300 dark:bg-blue-400 flex-shrink-0" />
            <span
              className="text-sm uppercase truncate"
              title={litter.FatherName}
            >
              {litter.FatherName || "—"}
            </span>
            <NoteFlag isVisible={litter.HasNotes} />
          </div>

          {/* Mother row */}
          <div className="relative flex w-[calc(100vw-82px)] items-center space-x-1.5 md:w-auto">
            <div className="size-2 rounded-full bg-pink-300 dark:bg-pink-400 flex-shrink-0" />
            <span
              className="text-sm uppercase truncate"
              title={litter.MotherName}
            >
              {litter.MotherName || "—"}
            </span>
          </div>

          {/* Info row */}
          <div className="flex items-center">
            <div className="text-sm text-slate-600 dark:text-slate-400 flex space-x-1 truncate">
              {/* Kennel */}
              {litter.KennelName && <span>{litter.KennelName}</span>}

              {/* Status */}
              {litter.Status && (
                <>
                  {litter.KennelName && <span className="text-slate-400">•</span>}
                  <span>{litter.Status}</span>
                </>
              )}

              {/* Date of Birth */}
              {formattedDate && (
                <>
                  {(litter.KennelName || litter.Status) && (
                    <span className="text-slate-400">•</span>
                  )}
                  <span>{formattedDate}</span>
                </>
              )}
            </div>

            {/* Pet Services - right side of info row */}
            <PetServices services={litter.Services} className="ml-auto" />
          </div>
        </div>
      </div>

      {/* Tier Marks - positioned by component (absolute right-0) */}
      <TierMark tierMarks={litter.TierMarks} mode="list" className="top-3" />
    </EntityListCardWrapper>
  );
}

/**
 * Skeleton for LitterListCard - no avatar, just text placeholders
 */
LitterListCard.Skeleton = function LitterListCardSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-7 h-[68px] animate-pulse border-b border-surface-border">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-2/3" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2" />
      </div>
    </div>
  );
};
