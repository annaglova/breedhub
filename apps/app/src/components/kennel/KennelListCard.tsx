import { NoteFlag } from "@/components/shared/NoteFlag";
import { PetServices } from "@/components/shared/PetServices";
import { TierMark } from "@/components/shared/TierMark";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { EntityListCardWrapper } from "@/components/space/EntityListCardWrapper";

// Tier marks format from DB
interface TierMarkEntry {
  contact_name?: string;
  product_name?: string;
}

interface TierMarksData {
  owner?: TierMarkEntry;
  breeder?: TierMarkEntry;
}

// Interface for kennel data from RxDB/Supabase
interface KennelEntity {
  id: string;
  name?: string;
  avatar_url?: string;
  verification_status_id?: string;
  company_foundation_date?: string;
  owner_name?: string;
  federation_name?: string;
  tier_marks?: TierMarksData;
  services?: string[] | Record<string, string>;
  notes?: string;
  [key: string]: any;
}

interface KennelListCardProps {
  entity: KennelEntity;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * Extract year from date string
 */
function getYear(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.getFullYear().toString();
  } catch {
    return "";
  }
}

export function KennelListCard({
  entity,
  selected = false,
  onClick,
}: KennelListCardProps) {
  // Kennels use default slate outline (no sex-based or user-based coloring)
  const outlineClass = "outline-slate-300 dark:outline-slate-400";

  const kennel = {
    Name: entity.name || "Unknown",
    Avatar: entity.avatar_url,
    VerificationStatus: entity.verification_status_id,
    OwnerName: entity.owner_name || "",
    FederationName: entity.federation_name || "",
    FoundationYear: getYear(entity.company_foundation_date),
    HasNotes: !!entity.notes,
    TierMarks: entity.tier_marks,
    Services: entity.services,
  };

  return (
    <EntityListCardWrapper
      selected={selected}
      onClick={onClick}
      className="h-[68px] relative"
    >
      <div className="flex items-center w-full">
        {/* Avatar with verification badge */}
        <div className="relative flex">
          <div
            className={`size-10 rounded-full border border-surface-border flex-shrink-0 outline outline-2 outline-offset-2 ${outlineClass}`}
          >
            <div className="w-full h-full rounded-full overflow-hidden">
              {kennel.Avatar ? (
                <img
                  src={kennel.Avatar}
                  alt={kennel.Name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.fallback) {
                      target.dataset.fallback = "true";
                      target.style.display = "none";
                      target.parentElement
                        ?.querySelector(".fallback-avatar")
                        ?.classList.remove("hidden");
                    }
                  }}
                />
              ) : null}
              <div
                className={`fallback-avatar flex size-full items-center justify-center rounded-full bg-slate-50 text-lg uppercase text-sub-header-color dark:bg-slate-700 ${
                  kennel.Avatar ? "hidden" : ""
                }`}
              >
                {kennel.Name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            </div>
          </div>
          {/* Verification badge - bottom right of avatar */}
          <VerificationBadge
            status={kennel.VerificationStatus}
            size={12}
            className="absolute z-10 -bottom-[0.24rem] -right-[0.24rem]"
          />
        </div>

        {/* Details */}
        <div className="ml-4 w-full space-y-0.5">
          {/* Name row */}
          <div className="relative flex w-[calc(100vw-122px)] space-x-1 md:w-auto">
            <span className="text-md truncate" title={kennel.Name}>
              {kennel.Name}
            </span>
            <NoteFlag isVisible={kennel.HasNotes} />
          </div>

          {/* Info row */}
          <div className="flex items-center">
            <div className="text-sm text-slate-600 dark:text-slate-400 flex space-x-1 truncate">
              {/* Owner name */}
              {kennel.OwnerName && <span>{kennel.OwnerName}</span>}

              {/* Federation */}
              {kennel.FederationName && (
                <>
                  {kennel.OwnerName && (
                    <span className="text-slate-400">•</span>
                  )}
                  <span>{kennel.FederationName}</span>
                </>
              )}

              {/* Foundation year - hidden on mobile */}
              {kennel.FoundationYear && (
                <span className="hidden sm:flex items-center space-x-1">
                  <span className="text-slate-400">•</span>
                  <span>Since {kennel.FoundationYear}</span>
                </span>
              )}
            </div>

            {/* Pet Services - right side of info row */}
            <PetServices services={kennel.Services} className="ml-auto mt-1" />
          </div>
        </div>
      </div>

      {/* Tier Marks - positioned by component (absolute right-0) */}
      <TierMark tierMarks={kennel.TierMarks} mode="list" className="top-3" />
    </EntityListCardWrapper>
  );
}
