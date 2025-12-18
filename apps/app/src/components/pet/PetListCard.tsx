import { EntityListCardWrapper } from "@/components/space/EntityListCardWrapper";
import { NoteFlag } from "@/components/shared/NoteFlag";
import { VerificationBadge } from "@/components/entity/VerificationBadge";
import { TierMark } from "@/components/entity/TierMark";
import { PetServices } from "@/components/entity/PetServices";

// Interface for pet data from RxDB
interface PetEntity {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  avatar_url?: string;
  Avatar?: string;
  pet_status?: string | { Id?: string; Name?: string };
  pet_status_id?: string;
  verification_status?: string | { Id?: string; Name?: string };
  verification_status_id?: string;
  date_of_birth?: string;
  coi?: number;
  inbreeding_percent?: number;
  tier_marks?: any[];
  services?: any[];
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
  // Extract data from the entity with fallbacks
  const pet = {
    Id: entity.Id || entity.id,
    Name: entity.Name || entity.name || "Unknown",
    Avatar: entity.Avatar || entity.avatar_url,
    // Status - can be object or string
    PetStatus:
      typeof entity.pet_status === "object"
        ? (entity.pet_status as any)?.Name
        : entity.pet_status || entity.pet_status_id,
    // Verification - use real data or random for visual testing
    VerificationStatus:
      entity.verification_status ||
      entity.verification_status_id ||
      (Math.random() > 0.5 ? { Id: "13c697a5-4895-4ec8-856c-536b925fd54f" } : undefined),
    // Dates and measurements
    DateOfBirth: entity.date_of_birth,
    COI: entity.coi ?? entity.inbreeding_percent,
    // Notes - random for visual testing
    HasNotes: Math.random() > 0.7,
    // Tier marks - random for visual testing
    TierMarks: entity.tier_marks || (Math.random() > 0.6 ? [
      { Contact: { Id: "c1", Name: "Test Patron" }, Product: { Name: Math.random() > 0.5 ? "Supreme Patron" : "Professional" }, Type: Math.random() > 0.5 ? "breeder" : "owner" }
    ] : []),
    // Services - random for visual testing
    Services: entity.services || (Math.random() > 0.5 ? [
      { ServiceType: { Id: ["ea48e37d-8f65-4122-bc00-d012848d78ae", "3370ee61-86de-49ae-a8ec-5cef5f213ecd", "ddc59ace-c622-4d6b-b473-19e9a313ed21"][Math.floor(Math.random() * 3)] } }
    ] : []),
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
