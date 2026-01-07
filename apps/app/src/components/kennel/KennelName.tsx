import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { NoteFlagButton } from "@ui/components/note-flag-button";
import { Link } from "react-router-dom";

interface KennelNameProps {
  entity?: any;
  hasNotes?: boolean;
  onNotesClick?: () => void;
  /** If true, clicking on name navigates to fullscreen page */
  linkToFullscreen?: boolean;
}

/**
 * Format year from date string
 */
function formatYear(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.getFullYear().toString();
  } catch {
    return "";
  }
}

// Mock data for development
const MOCK_KENNEL = {
  name: "Haus Wunderbar German Shepherds",
  slug: "haus-wunderbar",
  country: { name: "Germany", code: "DE" },
  owner: { name: "Klaus Bergmann", slug: "klaus-bergmann" },
  federation: { alternativeName: "VDH / FCI" },
  companyFoundationDate: "1998-03-20",
  verification_status_id: "verified",
  hasNotes: true,
};

/**
 * KennelName - Displays kennel name and details
 *
 * Based on Angular: libs/schema/domain/kennel/kennel-name/kennel-name.component.ts
 * Shows: country, kennel name, verification status, owner, federation, since year
 */
export function KennelName({
  entity,
  hasNotes = false,
  onNotesClick,
  linkToFullscreen = true,
}: KennelNameProps) {
  // Use entity data or mock for development
  // Check if entity has actual data (not just empty object)
  const hasEntityData = entity && entity.name;
  const kennel = hasEntityData ? entity : MOCK_KENNEL;

  // Extract data from entity
  const displayName = kennel?.name || "Unknown Kennel";
  const countryName = kennel?.country?.name || kennel?.country_name;
  const ownerName = kennel?.owner?.name || kennel?.owner_name;
  const ownerSlug = kennel?.owner?.slug || kennel?.owner_slug;
  const federationName = kennel?.federation?.alternativeName || kennel?.federation?.alternative_name || kennel?.federation_name;
  const foundationYear = formatYear(kennel?.company_foundation_date || kennel?.companyFoundationDate);

  return (
    <div className="pb-3 cursor-default">
      {/* Country - same position as achievement in BreedName */}
      <div className="text-md mb-2 min-h-[1.5rem]">
        {countryName && (
          <span className="uppercase">{countryName}</span>
        )}
      </div>

      {/* Kennel name with verification and note flag */}
      <div className="flex space-x-1.5">
        <div className="truncate py-0.5 text-3xl font-bold">
          {linkToFullscreen && kennel?.slug ? (
            <Link
              to={`/${kennel.slug}`}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              {displayName}
            </Link>
          ) : (
            <span className="cursor-default">{displayName}</span>
          )}
        </div>

        {/* Verification badge */}
        <VerificationBadge
          status={kennel?.verification_status_id || kennel?.verificationStatusId}
          size={16}
          mode="page"
        />

        {/* Note flag */}
        <NoteFlagButton
          hasNotes={hasNotes || kennel?.hasNotes}
          onClick={onNotesClick}
          mode="page"
          className="self-start pr-7"
        />
      </div>

      {/* Additional info: owner, federation, since */}
      <div className="flex items-center">
        <div className="text-secondary flex flex-wrap items-center space-x-2 font-medium">
          {/* Placeholder circle (like sex mark in PetName) */}
          <div className="bg-primary-300 dark:bg-surface-400 size-4 rounded-full" />

          {/* Owner */}
          {ownerName && (
            <div className="flex items-center">
              {ownerSlug ? (
                <Link to={`/${ownerSlug}`} className="hover:underline">
                  {ownerName}
                </Link>
              ) : (
                <span>{ownerName}</span>
              )}
            </div>
          )}

          {/* Federation */}
          {federationName && (
            <div className="flex items-center">
              <span className="mr-2">&bull;</span>
              <span>{federationName}</span>
            </div>
          )}

          {/* Since (foundation year) - hidden on mobile */}
          {foundationYear && (
            <div className="hidden sm:flex items-center">
              <span className="mr-2">&bull;</span>
              <span>Since {foundationYear}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
