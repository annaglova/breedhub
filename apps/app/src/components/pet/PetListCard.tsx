import { EntityListCardWrapper } from "@/components/space/EntityListCardWrapper";
import { NoteFlag } from "@/components/shared/NoteFlag";
import { PetSexMark } from "@/components/shared/PetSexMark";
import { CheckCircle, Shield, ShieldCheck } from "lucide-react";

/**
 * Pet entity interface for PetListCard
 *
 * Required fields in app_config.json for pet space:
 * - name (string) - Pet name
 * - avatar_url (string) - Pet avatar URL
 * - sex (string) - "male" | "female"
 * - date_of_birth (string) - ISO date string
 * - pet_status (string) - Status name like "Active", "Retired"
 * - coi (number) - Coefficient of inbreeding
 * - verification_status (string) - "verified" | "unverified" | "pending"
 * - has_notes (boolean) - Whether pet has notes
 * - tier_marks (array) - Array of tier marks like ["gold", "silver"]
 * - services (array) - Array of service codes like ["stud", "breeding"]
 */
interface PetEntity {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  avatar_url?: string;
  Avatar?: string;
  sex?: string;
  Sex?: string;
  date_of_birth?: string;
  DateOfBirth?: string;
  pet_status?: string;
  PetStatus?: { Name?: string } | string;
  coi?: number;
  COI?: number;
  verification_status?: string;
  VerificationStatus?: string;
  has_notes?: boolean;
  HasNotes?: boolean;
  tier_marks?: string[];
  TierMarks?: string[];
  services?: string[];
  Services?: string[];
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

/**
 * Verification badge component
 */
function VerificationBadge({ status }: { status?: string }) {
  if (!status || status === "unverified") return null;

  const isVerified = status === "verified";
  const isPending = status === "pending";

  if (isVerified) {
    return (
      <div className="absolute z-10 -bottom-0.5 -right-0.5 bg-white dark:bg-gray-900 rounded-full">
        <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="absolute z-10 -bottom-0.5 -right-0.5 bg-white dark:bg-gray-900 rounded-full">
        <Shield className="h-3.5 w-3.5 text-yellow-500" />
      </div>
    );
  }

  return null;
}

/**
 * Tier marks display component
 */
function TierMarks({ marks }: { marks?: string[] }) {
  if (!marks || marks.length === 0) return null;

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "gold":
        return "bg-yellow-400";
      case "silver":
        return "bg-gray-300";
      case "bronze":
        return "bg-amber-600";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="flex gap-0.5">
      {marks.slice(0, 3).map((mark, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full ${getTierColor(mark)}`}
          title={mark}
        />
      ))}
    </div>
  );
}

/**
 * Pet services icons component
 */
function PetServices({ services }: { services?: string[] }) {
  if (!services || services.length === 0) return null;

  // Simple service indicator - can be expanded later
  return (
    <div className="flex gap-1 items-center">
      {services.includes("stud") && (
        <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
          Stud
        </span>
      )}
      {services.includes("breeding") && (
        <span className="text-xs px-1.5 py-0.5 bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 rounded">
          Breed
        </span>
      )}
    </div>
  );
}

/**
 * Dot separator component
 */
function Dot({
  children,
  showDot = true,
}: {
  children: React.ReactNode;
  showDot?: boolean;
}) {
  if (!children) return null;
  return (
    <span className="flex items-center gap-1">
      {showDot && <span className="text-gray-400">•</span>}
      {children}
    </span>
  );
}

export function PetListCard({
  entity,
  selected = false,
  onClick,
}: PetListCardProps) {
  // Extract data from the entity with fallbacks (support both camelCase and snake_case)
  const pet = {
    Id: entity.Id || entity.id,
    Name: entity.Name || entity.name || "Unknown",
    Avatar: entity.Avatar || entity.avatar_url,
    Sex: (entity.Sex || entity.sex || "").toLowerCase() as "male" | "female" | undefined,
    DateOfBirth: entity.DateOfBirth || entity.date_of_birth,
    PetStatus:
      typeof entity.PetStatus === "object"
        ? entity.PetStatus?.Name
        : entity.PetStatus || entity.pet_status,
    COI: entity.COI || entity.coi,
    VerificationStatus:
      entity.VerificationStatus || entity.verification_status,
    HasNotes: entity.HasNotes || entity.has_notes || false,
    TierMarks: entity.TierMarks || entity.tier_marks || [],
    Services: entity.Services || entity.services || [],
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
        <div className="relative flex-shrink-0">
          <div className="size-10 rounded-full border border-surface-border overflow-hidden">
            {pet.Avatar ? (
              <img
                src={pet.Avatar}
                alt={pet.Name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div
              className={`w-full h-full flex items-center justify-center text-lg uppercase ${
                pet.Sex === "male"
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                  : pet.Sex === "female"
                  ? "bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-200"
              }`}
              style={{ display: pet.Avatar ? "none" : "flex" }}
            >
              {pet.Name?.charAt(0)}
            </div>
          </div>
          <VerificationBadge status={pet.VerificationStatus} />
          {/* Sex indicator line at bottom of avatar */}
          <PetSexMark
            sex={pet.Sex}
            style="horizontal"
            className="absolute -bottom-1 left-0 right-0"
          />
        </div>

        {/* Details */}
        <div className="ml-4 flex-1 min-w-0 space-y-0.5">
          {/* Name row */}
          <div className="flex items-center gap-1 w-[calc(100vw-122px)] md:w-auto">
            <span
              className="font-medium truncate"
              title={pet.Name}
            >
              {pet.Name}
            </span>
            <NoteFlag isVisible={pet.HasNotes} className="flex-shrink-0" />
          </div>

          {/* Info row */}
          <div className="flex items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 truncate">
              {pet.PetStatus && (
                <span>{pet.PetStatus}</span>
              )}
              {formattedDate && (
                <Dot showDot={!!pet.PetStatus}>{formattedDate}</Dot>
              )}
              {pet.COI !== undefined && (
                <Dot showDot={!!(pet.PetStatus || formattedDate)} className="hidden sm:flex">
                  COI - {pet.COI}%
                </Dot>
              )}
            </div>
            <PetServices services={pet.Services} />
          </div>
        </div>
      </div>

      {/* Tier marks - absolute positioned top right */}
      {pet.TierMarks && pet.TierMarks.length > 0 && (
        <div className="absolute top-3 right-4 sm:right-6">
          <TierMarks marks={pet.TierMarks} />
        </div>
      )}
    </EntityListCardWrapper>
  );
}

// ========================================
// MOCK DATA for testing and config reference
// ========================================

/**
 * Mock pet data for testing the component.
 * This shows what fields you need to configure in app_config.json
 */
export const MOCK_PETS: PetEntity[] = [
  {
    id: "pet-1",
    name: "Champion Rex vom Schwarzwald",
    avatar_url: "https://placedog.net/100/100?id=1",
    sex: "male",
    date_of_birth: "2020-03-15",
    pet_status: "Active",
    coi: 3.5,
    verification_status: "verified",
    has_notes: true,
    tier_marks: ["gold"],
    services: ["stud"],
  },
  {
    id: "pet-2",
    name: "Bella von Edelweiss",
    avatar_url: "https://placedog.net/100/100?id=2",
    sex: "female",
    date_of_birth: "2019-07-22",
    pet_status: "Breeding",
    coi: 2.1,
    verification_status: "verified",
    has_notes: false,
    tier_marks: ["gold", "silver"],
    services: ["breeding"],
  },
  {
    id: "pet-3",
    name: "Max vom Königsberg",
    avatar_url: "", // No avatar - will show initial
    sex: "male",
    date_of_birth: "2021-01-10",
    pet_status: "Junior",
    coi: 4.2,
    verification_status: "pending",
    has_notes: false,
    tier_marks: [],
    services: [],
  },
  {
    id: "pet-4",
    name: "Luna aus Bayern",
    sex: "female",
    date_of_birth: "2022-05-18",
    pet_status: "Active",
    verification_status: "unverified",
    has_notes: true,
    tier_marks: ["bronze"],
    services: ["breeding", "stud"],
  },
];

/**
 * Example app_config.json fields configuration for pet space:
 *
 * {
 *   "fields": {
 *     "name": { "type": "string", "label": "Name" },
 *     "avatar_url": { "type": "string", "label": "Avatar URL" },
 *     "sex": { "type": "enum", "label": "Sex", "options": ["male", "female"] },
 *     "date_of_birth": { "type": "date", "label": "Date of Birth" },
 *     "pet_status": { "type": "string", "label": "Status" },
 *     "coi": { "type": "number", "label": "COI %" },
 *     "verification_status": { "type": "enum", "label": "Verification", "options": ["verified", "pending", "unverified"] },
 *     "has_notes": { "type": "boolean", "label": "Has Notes" },
 *     "tier_marks": { "type": "array", "label": "Tier Marks" },
 *     "services": { "type": "array", "label": "Services" }
 *   }
 * }
 */
