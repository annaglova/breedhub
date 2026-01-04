import { NoteFlag } from "@/components/shared/NoteFlag";
import { PetServices } from "@/components/shared/PetServices";
import { TierMark } from "@/components/shared/TierMark";
import { EntityListCardWrapper } from "@/components/space/EntityListCardWrapper";
// TODO: Uncomment when connecting real data
// import { useDictionaryValue } from "@/hooks/useDictionaryValue";

// Tier marks format from DB
interface TierMarkEntry {
  contact_name?: string;
  product_name?: string;
}

interface TierMarksData {
  owner?: TierMarkEntry;
  breeder?: TierMarkEntry;
}

// Interface for litter data from RxDB
interface LitterEntity {
  id: string;
  name?: string;
  notes?: string;
  status_id?: string;
  kennel_id?: string;
  kennel_name?: string; // Resolved kennel name (if joined)
  date_of_birth?: string;
  tier_marks?: TierMarksData;
  services?: Record<string, string>;
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
  // TODO: Replace with real dictionary lookup when ready
  // const statusName = useDictionaryValue("litter_status", entity.status_id);

  // Mock data for UI development - will be replaced with real data
  const litter = {
    Id: entity.id,
    Name: entity.name || "Unknown",
    // Status - mock for visual testing (always show)
    Status: "Born",
    // Kennel - mock for visual testing (always show)
    KennelName: "Mock Kennel",
    // Dates
    DateOfBirth: entity.date_of_birth,
    // Notes - mock for visual testing (always show)
    HasNotes: true,
    // Tier marks - mock for visual testing (always show)
    // Requires product_name to display!
    TierMarks: {
      owner: { contact_name: "Mock Owner", product_name: "Professional" },
      breeder: { contact_name: "Mock Breeder", product_name: "Supreme Patron" },
    },
    // Services - mock for visual testing (always show)
    // Must use real service IDs from SERVICE_ICONS in PetServices.tsx
    Services: {
      "1": "3370ee61-86de-49ae-a8ec-5cef5f213ecd", // Children for sale
      "2": "ea48e37d-8f65-4122-bc00-d012848d78ae", // Mating
    },
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
        <div className="w-full space-y-0.5">
          {/* Name row */}
          <div className="relative flex w-[calc(100vw-82px)] space-x-1 md:w-auto">
            <span className="text-md truncate" title={litter.Name}>
              {litter.Name}
            </span>
            <NoteFlag isVisible={litter.HasNotes} />
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
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2" />
      </div>
    </div>
  );
};
