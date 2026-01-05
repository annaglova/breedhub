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

  // Mock data for UI development - will be replaced with real data
  const kennel = {
    Id: entity.id,
    Name: entity.name || "Unknown",
    Avatar: entity.avatar_url,
    // HasUser - mock for visual testing (always show outline)
    HasUser: true,
    // VerificationStatus - mock for visual testing (always show verified)
    VerificationStatus: "verified",
    // Owner - mock for visual testing (always show)
    OwnerName: "Mock Owner",
    // Federation - mock for visual testing (always show)
    FederationName: "AKC",
    // Foundation year - mock for visual testing (always show)
    FoundationYear: "2010",
    // Notes - mock for visual testing (always show)
    HasNotes: true,
    // Tier marks - mock for visual testing (always show)
    // Requires product_name to display!
    TierMarks: {
      owner: { contact_name: "Mock Owner", product_name: "Professional" },
    },
    // Services - mock for visual testing (always show)
    // Must use real service IDs from SERVICE_ICONS in PetServices.tsx
    Services: {
      "1": "3370ee61-86de-49ae-a8ec-5cef5f213ecd", // Children for sale
      "2": "ea48e37d-8f65-4122-bc00-d012848d78ae", // Mating
    },
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
          <div
            className={`size-10 rounded-full border border-surface-border flex-shrink-0 outline outline-2 outline-offset-2 ${getOutlineClass()}`}
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
                className={`fallback-avatar flex size-full items-center justify-center rounded-full bg-slate-200 text-lg uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-200 ${
                  kennel.Avatar ? "hidden" : ""
                }`}
              >
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
