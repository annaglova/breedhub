import { NoteFlag } from "@/components/shared/NoteFlag";
import { PetServices } from "@/components/shared/PetServices";
import { TierMark } from "@/components/shared/TierMark";
import { EntityListCardWrapper } from "@/components/space/EntityListCardWrapper";
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

// Interface for litter data from RxDB (enriched via litter_with_parents VIEW)
interface LitterEntity {
  id: string;
  name?: string;
  notes?: string;
  status_id?: string;
  kennel_id?: string;
  // Enriched fields from VIEW
  father_name?: string;
  mother_name?: string;
  kennel_name?: string;
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

  // Extract data from entity - use real DB values from VIEW
  const litter = {
    Id: entity.id,
    Name: entity.name || "Unknown",
    // Father and Mother - from VIEW (litter_with_parents)
    FatherName: entity.father_name || "",
    MotherName: entity.mother_name || "",
    // Status - resolved from dictionary
    Status: statusName,
    // Kennel - from VIEW
    KennelName: entity.kennel_name,
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
              {/* Status */}
              {litter.Status && <span>{litter.Status}</span>}

              {/* Kennel */}
              {litter.KennelName && (
                <>
                  {litter.Status && <span className="text-slate-400">•</span>}
                  <span>{litter.KennelName}</span>
                </>
              )}

              {/* Date of Birth */}
              {formattedDate && (
                <>
                  {(litter.Status || litter.KennelName) && (
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
