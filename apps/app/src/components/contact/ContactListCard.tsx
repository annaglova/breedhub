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

// Contact roles format from DB - { breeder: true, judge: true, handler: true }
interface ContactRoles {
  breeder?: boolean;
  judge?: boolean;
  handler?: boolean;
  owner?: boolean;
}

// Interface for contact data from RxDB/Supabase
interface ContactEntity {
  id: string;
  name?: string;
  given_name?: string;
  surname?: string;
  avatar_url?: string;
  account_id?: string; // If not null, contact has a linked user account
  verification_status_id?: string;
  contact_roles?: ContactRoles;
  breed_patronage?: BreedPatronage[];
  tier_marks?: TierMarksData;
  notes?: string;
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
  // Determine avatar outline color based on whether contact has a linked user account
  const hasUser = !!entity.account_id;
  const getOutlineClass = () => {
    return hasUser
      ? "outline-primary-300 dark:outline-primary-400"
      : "outline-slate-300 dark:outline-slate-400";
  };

  // Extract roles from contact_roles JSONB field
  const roles = entity.contact_roles || {};
  const isBreeder = !!roles.breeder;
  const isJudge = !!roles.judge;
  const isHandler = !!roles.handler;

  // Build display name from available fields
  const displayName =
    entity.name ||
    `${entity.given_name || ""} ${entity.surname || ""}`.trim() ||
    "Unknown";

  // Extract data from the entity - uses real DB values
  const contact = {
    Id: entity.id,
    Name: displayName,
    Avatar: entity.avatar_url,
    // Verification status - uses real data from entity
    VerificationStatus: entity.verification_status_id,
    // Career roles - uses real data from contact_roles JSONB
    IsBreeder: isBreeder,
    IsJudge: isJudge,
    IsHandler: isHandler,
    // Notes - uses real data from entity
    HasNotes: !!entity.notes,
    // Breed patronage - uses real data from entity
    BreedPatronage: entity.breed_patronage,
    // Tier marks - uses real data from entity
    TierMarks: entity.tier_marks,
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
                className={`fallback-avatar flex size-full items-center justify-center rounded-full bg-slate-50 text-lg uppercase text-sub-header-color dark:bg-slate-700 ${
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

              {/* Handler */}
              {contact.IsHandler && (
                <>
                  {(contact.IsBreeder || contact.IsJudge) && (
                    <span className="text-slate-400">&bull;</span>
                  )}
                  <span>Handler</span>
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
