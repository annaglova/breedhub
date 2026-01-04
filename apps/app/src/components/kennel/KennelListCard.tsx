import { EntityListCardWrapper } from "@/components/space/EntityListCardWrapper";
import { NoteFlag } from "@/components/shared/NoteFlag";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { TierMark } from "@/components/shared/TierMark";
import { PetServices } from "@/components/shared/PetServices";

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
  has_user?: boolean;
  verification_status_id?: string;
  verification_status?: string;
  // Owner can be nested object or direct field
  owner_name?: string;
  owner?: { name?: string };
  // Federation can be nested object or direct field
  federation_name?: string;
  federation?: { alternative_name?: string; name?: string };
  // Foundation date or year
  company_foundation_date?: string;
  established_year?: number;
  tier_marks?: TierMarksData;
  services?: Record<string, string>;
  notes?: string;
  has_notes?: boolean;
  [key: string]: any;
}

interface KennelListCardProps {
  entity: KennelEntity;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * Extract year from date string or number
 */
function getYear(dateString?: string, yearNumber?: number): string {
  if (yearNumber) return yearNumber.toString();
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
  // Determine avatar outline color based on HasUser
  const getOutlineClass = () => {
    return entity.has_user
      ? "outline-primary-300 dark:outline-primary-400"
      : "outline-slate-300 dark:outline-slate-400";
  };

  // Extract data from the entity - handle both DB format and mock format
  const kennel = {
    Id: entity.id,
    Name: entity.name || "Unknown",
    Avatar: entity.avatar_url,
    HasUser: entity.has_user,
    VerificationStatus: entity.verification_status_id || entity.verification_status,
    OwnerName: entity.owner_name || entity.owner?.name,
    FederationName: entity.federation_name || entity.federation?.alternative_name || entity.federation?.name,
    FoundationYear: getYear(entity.company_foundation_date, entity.established_year),
    HasNotes: entity.has_notes ?? !!entity.notes,
    TierMarks: entity.tier_marks,
    Services: entity.services,
  };

  // Get first letter for fallback avatar
  const firstLetter = kennel.Name?.charAt(0)?.toUpperCase() || "?";

  return (
    <EntityListCardWrapper
      selected={selected}
      onClick={onClick}
      className="h-[68px] relative"
    >
      <div className="flex items-center w-full">
        {/* Avatar with verification badge */}
        <div className="relative flex">
          <div className={`size-10 rounded-full border border-surface-border flex-shrink-0 outline outline-2 outline-offset-2 ${getOutlineClass()}`}>
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
                      target.parentElement?.querySelector(".fallback-avatar")?.classList.remove("hidden");
                    }
                  }}
                />
              ) : null}
              <div className={`fallback-avatar flex size-full items-center justify-center rounded-full bg-slate-200 text-lg uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-200 ${kennel.Avatar ? "hidden" : ""}`}>
                {firstLetter}
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
            <span className="truncate font-medium" title={kennel.Name}>
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
                  {kennel.OwnerName && <span className="text-slate-400">•</span>}
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
            <PetServices services={kennel.Services} className="ml-auto" />
          </div>
        </div>
      </div>

      {/* Tier Marks - positioned by component (absolute right-0) */}
      <TierMark
        tierMarks={kennel.TierMarks}
        mode="list"
        className="top-3"
      />
    </EntityListCardWrapper>
  );
}
