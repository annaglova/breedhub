import { EntityTabCardWrapper } from "@/components/space/EntityTabCardWrapper";
import { NoteFlag } from "@/components/shared/NoteFlag";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { TierMark } from "@/components/shared/TierMark";
import { PetServices } from "@/components/shared/PetServices";
import { PetSexMark } from "@/components/shared/PetSexMark";
import { useDictionaryValue } from "@/hooks/useDictionaryValue";
import defaultPetLogo from "@/assets/images/pettypes/dog-logo.svg";

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
  tier_marks?: TierMarksData;
  services?: Record<string, string>;
  notes?: string;
  [key: string]: any;
}

interface PetTabCardProps {
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

export function PetTabCard({
  entity,
  selected = false,
  onClick,
}: PetTabCardProps) {
  // Resolve pet_status_id to name via dictionary lookup
  const petStatusName = useDictionaryValue("pet_status", entity.pet_status_id);

  // Resolve sex_id to code via dictionary lookup
  const sexCode = useDictionaryValue("sex", entity.sex_id, "code");

  // Extract data from the entity
  const pet = {
    Id: entity.id,
    Name: entity.name || "Unknown",
    Avatar: entity.avatar_url,
    PetStatus: petStatusName,
    VerificationStatus: entity.verification_status_id,
    DateOfBirth: entity.date_of_birth,
    HasNotes: !!entity.notes || Math.random() > 0.7, // Mock for visual testing
    TierMarks: entity.tier_marks,
    Services: entity.services,
  };

  const formattedDate = formatDate(pet.DateOfBirth);

  return (
    <EntityTabCardWrapper selected={selected} onClick={onClick}>
      {/* Image container */}
      <div className="relative flex h-[206px] justify-center overflow-hidden rounded-xl border border-surface-border">
        {/* Tier marks - grid mode */}
        <TierMark tierMarks={pet.TierMarks} mode="grid" className="mt-3" />

        {/* Pet avatar with hover scale effect, or fallback logo on gray */}
        {pet.Avatar ? (
          <img
            className="w-full h-auto max-h-[200%] duration-300 group-hover:scale-110 absolute inset-0 m-auto object-cover"
            src={pet.Avatar}
            alt={pet.Name}
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.fallback) {
                target.dataset.fallback = "true";
                target.style.display = "none";
                target.parentElement
                  ?.querySelector(".fallback-container")
                  ?.classList.remove("hidden");
              }
            }}
          />
        ) : null}
        {/* Fallback: logo on gray background */}
        <div
          className={`fallback-container absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-700 ${
            pet.Avatar ? "hidden" : ""
          }`}
        >
          <img
            src={defaultPetLogo}
            alt={pet.Name}
            className="w-2/3 h-auto duration-300 group-hover:scale-110"
          />
        </div>
      </div>

      {/* Content area */}
      <div className="w-full p-2">
        {/* Name row */}
        <div className="flex space-x-1.5 items-center">
          <div className="w-auto truncate" title={pet.Name}>
            {pet.Name}
          </div>
          <VerificationBadge
            status={pet.VerificationStatus}
            size={12}
          />
          <NoteFlag isVisible={pet.HasNotes} className="text-sm" />
        </div>

        {/* Info row */}
        <div className="flex items-center">
          {/* Sex mark - round style */}
          <PetSexMark sex={sexCode} style="round" className="mr-2" />

          {/* Status and date */}
          <div className="text-slate-600 dark:text-slate-400 flex space-x-1 truncate text-sm">
            {/* Pet Status */}
            {pet.PetStatus && <span>{pet.PetStatus}</span>}

            {/* Date of Birth */}
            {formattedDate && (
              <>
                {pet.PetStatus && <span className="text-slate-400">•</span>}
                <span>{formattedDate}</span>
              </>
            )}
          </div>

          {/* Pet Services - right side */}
          <PetServices services={pet.Services} className="ml-auto" />
        </div>
      </div>
    </EntityTabCardWrapper>
  );
}
