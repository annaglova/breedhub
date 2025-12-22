import { EntityListCardWrapper } from "@/components/space/EntityListCardWrapper";
import { NoteFlag } from "@/components/shared/NoteFlag";
import { VerificationBadge } from "@/components/entity/VerificationBadge";
import { TierMark } from "@/components/entity/TierMark";
import { PetServices } from "@/components/entity/PetServices";
import { useDictionaryValue } from "@/hooks/useDictionaryValue";

// Interface for pet data from RxDB
interface PetEntity {
  id: string;
  name?: string;
  avatar_url?: string;
  pet_status_id?: string;
  verification_status_id?: string;
  date_of_birth?: string;
  coi?: number;
  tier_marks?: any[];
  services?: any[];
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

  // Extract data from the entity - use real DB values
  const pet = {
    Id: entity.id,
    Name: entity.name || "Unknown",
    Avatar: entity.avatar_url,
    // Status - resolved from dictionary
    PetStatus: petStatusName,
    // Verification status
    VerificationStatus: entity.verification_status_id
      ? { Id: entity.verification_status_id }
      : undefined,
    // Dates and measurements
    DateOfBirth: entity.date_of_birth,
    COI: entity.coi,
    // Notes - check if notes field exists and has content
    HasNotes: !!entity.notes,
    // Tier marks - from DB
    TierMarks: entity.tier_marks || [],
    // Services - from DB
    Services: entity.services || [],
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
          <div className="size-10 rounded-full border border-surface-border flex-shrink-0 outline outline-2 outline-offset-2 outline-gray-300 dark:outline-gray-400">
            <div className="w-full h-full rounded-full overflow-hidden">
              {pet.Avatar ? (
                <img
                  src={pet.Avatar}
                  alt={pet.Name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove(
                      "hidden"
                    );
                  }}
                />
              ) : null}
              <div
                className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-200 text-lg uppercase bg-gray-200 dark:bg-gray-700"
                style={{ display: pet.Avatar ? "none" : "flex" }}
              >
                {pet.Name?.charAt(0)}
              </div>
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
            <span className="truncate font-medium" title={pet.Name}>
              {pet.Name}
            </span>
            <NoteFlag isVisible={pet.HasNotes} />
          </div>

          {/* Info row */}
          <div className="flex items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 flex space-x-1 truncate">
              {/* Pet Status */}
              {pet.PetStatus && <span>{pet.PetStatus}</span>}

              {/* Date of Birth */}
              {formattedDate && (
                <>
                  {pet.PetStatus && <span className="text-gray-400">•</span>}
                  <span>{formattedDate}</span>
                </>
              )}

              {/* COI - hidden on mobile */}
              {pet.COI !== undefined && pet.COI !== null && (
                <span className="hidden sm:flex items-center space-x-1">
                  <span className="text-gray-400">•</span>
                  <span>COI - {pet.COI}%</span>
                </span>
              )}
            </div>

            {/* Pet Services - right side of info row */}
            <PetServices services={pet.Services} className="ml-auto" />
          </div>
        </div>
      </div>

      {/* Tier Marks - absolute top right */}
      <TierMark
        tierMarks={pet.TierMarks}
        mode="list"
        className="absolute top-3 right-0"
      />
    </EntityListCardWrapper>
  );
}
