import defaultPetAvatar from "@/assets/images/pettypes/dog.jpeg";
import { NoteFlag } from "@/components/shared/NoteFlag";
import { PetServices } from "@/components/shared/PetServices";
import { TierMark } from "@/components/shared/TierMark";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
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

// Interface for pet data from RxDB
interface PetEntity {
  id: string;
  name?: string;
  avatar_url?: string;
  pet_status_id?: string;
  sex_id?: string;
  verification_status_id?: string;
  date_of_birth?: string;
  coi?: number;
  tier_marks?: TierMarksData;
  services?: Record<string, string>; // Format: {"1": "service_id", "2": "service_id"}
  notes?: string;
  [key: string]: any;
}

interface PetListCardProps {
  entity: PetEntity;
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

export function PetListCard({
  entity,
  selected = false,
  onClick,
}: PetListCardProps) {
  // Resolve pet_status_id to name via dictionary lookup
  const petStatusName = useDictionaryValue("pet_status", entity.pet_status_id);

  // Resolve sex_id to code via dictionary lookup for avatar outline color
  const sexCode = useDictionaryValue("sex", entity.sex_id, "code");

  // Determine avatar outline color based on sex
  const getOutlineClass = () => {
    switch (sexCode) {
      case "male":
        return "outline-blue-300 dark:outline-blue-400";
      case "female":
        return "outline-pink-300 dark:outline-pink-400";
      default:
        return "outline-slate-300 dark:outline-slate-400";
    }
  };

  // Extract data from the entity - use real DB values + mock for UI components
  const pet = {
    Id: entity.id,
    Name: entity.name || "Unknown",
    Avatar: entity.avatar_url,
    // Status - resolved from dictionary
    PetStatus: petStatusName,
    // Verification status - uses real data from entity
    VerificationStatus: entity.verification_status_id,
    // Dates and measurements
    DateOfBirth: entity.date_of_birth,
    COI: entity.coi,
    // Notes - TODO: use real data when available
    HasNotes: !!entity.notes || Math.random() > 0.7, // Mock for visual testing
    // Tier marks - uses real data from entity
    // Format: { owner: { contact_name, product_name }, breeder: { contact_name, product_name } }
    TierMarks: entity.tier_marks,
    // Services - uses real data from entity
    // Format: {"1": "service_id", "2": "service_id", ...}
    Services: entity.services,
  };

  const formattedDate = formatDate(pet.DateOfBirth);

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
              <img
                src={pet.Avatar || defaultPetAvatar}
                alt={pet.Name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  // Fallback to default avatar on error (prevent infinite loop)
                  const target = e.currentTarget;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = "true";
                    target.src = defaultPetAvatar;
                  }
                }}
              />
            </div>
          </div>
          {/* Verification badge - bottom right of avatar */}
          <VerificationBadge
            status={pet.VerificationStatus}
            size={12}
            className="absolute z-10 -bottom-[0.24rem] -right-[0.24rem]"
          />
        </div>

        {/* Details */}
        <div className="ml-4 w-full space-y-0.5">
          {/* Name row */}
          <div className="relative flex w-[calc(100vw-122px)] space-x-1 md:w-auto">
            <span className="text-md truncate" title={pet.Name}>
              {pet.Name}
            </span>
            <NoteFlag isVisible={pet.HasNotes} />
          </div>

          {/* Info row */}
          <div className="flex items-center">
            <div className="text-sm text-slate-600 dark:text-slate-400 flex space-x-1 truncate">
              {/* Pet Status */}
              {pet.PetStatus && <span>{pet.PetStatus}</span>}

              {/* Date of Birth */}
              {formattedDate && (
                <>
                  {pet.PetStatus && <span className="text-slate-400">•</span>}
                  <span>{formattedDate}</span>
                </>
              )}

              {/* COI - hidden on mobile */}
              {pet.COI !== undefined && pet.COI !== null && (
                <span className="hidden sm:flex items-center space-x-1">
                  <span className="text-slate-400">•</span>
                  <span>COI - {pet.COI}%</span>
                </span>
              )}
            </div>

            {/* Pet Services - right side of info row */}
            <PetServices services={pet.Services} className="ml-auto mt-1" />
          </div>
        </div>
      </div>

      {/* Tier Marks - positioned by component (absolute right-0) */}
      <TierMark tierMarks={pet.TierMarks} mode="list" className="top-3" />
    </EntityListCardWrapper>
  );
}
