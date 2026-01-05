import { NoteFlag } from "@/components/shared/NoteFlag";
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

// Breed patronage format
interface BreedPatronage {
  breed_id: string;
  breed_name: string;
  place: number;
}

// Interface for contact data from RxDB/Supabase
interface ContactEntity {
  id: string;
  name?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  has_user?: boolean;
  verification_status_id?: string;
  verification_status?: string;
  // Career flags
  is_breeder?: boolean;
  is_judge?: boolean;
  is_handler?: boolean;
  is_owner?: boolean;
  career?: {
    breeder?: boolean;
    judge?: boolean;
    handler?: boolean;
  };
  // Breed patronage
  breed_patronage?: BreedPatronage[];
  tier_marks?: TierMarksData;
  notes?: string;
  has_notes?: boolean;
  [key: string]: any;
}

interface ContactListCardProps {
  entity: ContactEntity;
  selected?: boolean;
  onClick?: () => void;
}

// Patron place icons mapping
const PATRON_ICONS: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

export function ContactListCard({
  entity,
  selected = false,
  onClick,
}: ContactListCardProps) {
  // Determine avatar outline color based on HasUser
  const getOutlineClass = () => {
    return entity.has_user
      ? "outline-primary-300 dark:outline-primary-400"
      : "outline-slate-300 dark:outline-slate-400";
  };

  // Mock data for UI development - will be replaced with real data
  const contact = {
    Id: entity.id,
    Name:
      entity.name ||
      entity.display_name ||
      `${entity.first_name || ""} ${entity.last_name || ""}`.trim() ||
      "Unknown",
    Avatar: entity.avatar_url,
    // HasUser - mock for visual testing (always show outline)
    HasUser: true,
    // VerificationStatus - mock for visual testing (always show verified)
    VerificationStatus: "verified",
    // Career - mock for visual testing (always show both)
    IsBreeder: true,
    IsJudge: true,
    // Notes - mock for visual testing (always show)
    HasNotes: true,
    // Breed patronage - mock for visual testing (always show)
    BreedPatronage: [
      { breed_id: "breed-1", breed_name: "Golden Retriever", place: 1 },
      { breed_id: "breed-2", breed_name: "German Shepherd", place: 2 },
    ],
    // Tier marks - mock for visual testing (always show)
    // Requires product_name to display!
    TierMarks: {
      owner: { contact_name: "Mock Owner", product_name: "Professional" },
    },
  };

  // Get first letter for fallback avatar
  const firstLetter = contact.Name?.charAt(0)?.toUpperCase() || "?";

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
              {contact.Avatar ? (
                <img
                  src={contact.Avatar}
                  alt={contact.Name}
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
                  contact.Avatar ? "hidden" : ""
                }`}
              >
                {firstLetter}
              </div>
            </div>
          </div>
          {/* Verification badge - bottom right of avatar */}
          <VerificationBadge
            status={contact.VerificationStatus}
            size={12}
            className="absolute z-10 -bottom-[0.24rem] -right-[0.24rem]"
          />
        </div>

        {/* Details */}
        <div className="ml-4 w-full space-y-0.5">
          {/* Name row */}
          <div className="relative flex w-[calc(100vw-122px)] space-x-1 md:w-auto">
            <span className="text-md truncate" title={contact.Name}>
              {contact.Name}
            </span>
            <NoteFlag isVisible={contact.HasNotes} />
          </div>

          {/* Info row */}
          <div className="flex items-center">
            <div className="text-sm text-slate-600 dark:text-slate-400 flex space-x-1 truncate">
              {/* Breeder */}
              {contact.IsBreeder && <span>Breeder</span>}

              {/* Judge */}
              {contact.IsJudge && (
                <>
                  {contact.IsBreeder && (
                    <span className="text-slate-400">&bull;</span>
                  )}
                  <span>Judge</span>
                </>
              )}
            </div>

            {/* Breed Patronage icons - right side of info row */}
            <div className="ml-auto flex space-x-1 mt-1">
              {contact.BreedPatronage?.map((patronage) => (
                <span
                  key={patronage.breed_id}
                  className="text-sm"
                  title={`${patronage.breed_name}\n${patronage.place} place patron`}
                >
                  {PATRON_ICONS[patronage.place] || `#${patronage.place}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tier Marks - positioned by component (absolute right-0) */}
      <TierMark tierMarks={contact.TierMarks} mode="list" className="top-3" />
    </EntityListCardWrapper>
  );
}
