import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { NoteFlagButton } from "@ui/components/note-flag-button";
import { Link } from "react-router-dom";

interface ContactNameProps {
  entity?: any;
  hasNotes?: boolean;
  onNotesClick?: () => void;
  /** If true, clicking on name navigates to fullscreen page */
  linkToFullscreen?: boolean;
}

// Mock data for development
const MOCK_CONTACT = {
  name: "Klaus Bergmann",
  slug: "klaus-bergmann",
  country: { name: "Germany", code: "DE" },
  career: {
    breeder: ["German Shepherd", "Belgian Malinois"],
    judge: ["FCI Group 1"],
  },
  verification_status_id: "verified",
  hasNotes: true,
};

/**
 * ContactName - Displays contact name and details
 *
 * Based on Angular: libs/schema/domain/contact/lib/contact-name/contact-name.component.ts
 * Shows: country, name, verification status, roles (Breeder/Judge)
 */
export function ContactName({
  entity,
  hasNotes = false,
  onNotesClick,
  linkToFullscreen = true,
}: ContactNameProps) {
  // Extract data from entity with fallback to mock for each field
  const displayName = entity?.name || entity?.Name || MOCK_CONTACT.name;
  const countryName = entity?.country?.name || entity?.Country?.Name || entity?.country_name || MOCK_CONTACT.country.name;
  const slug = entity?.slug || entity?.Url || entity?.url || MOCK_CONTACT.slug;

  // Career roles - normalize to arrays with mock fallback
  const career = entity?.career || entity?.Career || MOCK_CONTACT.career;
  const breederBreeds = career?.breeder || career?.Breeder || [];
  const judgeCategories = career?.judge || career?.Judge || [];
  const isBreeder = breederBreeds.length > 0;
  const isJudge = judgeCategories.length > 0;

  return (
    <div className="pb-3 cursor-default">
      {/* Country */}
      <div className="text-md mb-2 min-h-[1.5rem]">
        {countryName && (
          <span className="uppercase">{countryName}</span>
        )}
      </div>

      {/* Contact name with verification and note flag */}
      <div className="flex space-x-1.5">
        <div className="truncate py-0.5 text-3xl font-bold">
          {linkToFullscreen && slug ? (
            <Link
              to={`/${slug}`}
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
          status={entity?.verification_status_id || entity?.verificationStatusId || MOCK_CONTACT.verification_status_id}
          size={16}
          mode="page"
        />

        {/* Note flag */}
        <NoteFlagButton
          hasNotes={hasNotes || entity?.hasNotes || MOCK_CONTACT.hasNotes}
          onClick={onNotesClick}
          mode="page"
          className="self-start pr-7"
        />
      </div>

      {/* Roles: Breeder / Judge */}
      <div className="flex items-center">
        <div className="text-secondary flex flex-wrap items-center space-x-2 font-medium">
          {/* Placeholder circle (like in KennelName) */}
          <div className="bg-primary-300 dark:bg-surface-400 size-4 rounded-full" />

          {/* Breeder role */}
          {isBreeder && (
            <span>Breeder</span>
          )}

          {/* Separator between roles */}
          {isBreeder && isJudge && (
            <span>&bull;</span>
          )}

          {/* Judge role */}
          {isJudge && (
            <span>Judge</span>
          )}
        </div>
      </div>
    </div>
  );
}
