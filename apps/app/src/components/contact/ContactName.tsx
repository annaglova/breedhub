import { useDictionaryValue } from "@/hooks/useDictionaryValue";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { NoteFlagButton } from "@ui/components/note-flag-button";
import { Link } from "react-router-dom";

interface ContactRoles {
  breeder?: boolean;
  judge?: boolean;
  handler?: boolean;
  owner?: boolean;
}

interface ContactNameProps {
  entity?: {
    name?: string;
    slug?: string;
    country_id?: string;
    contact_roles?: ContactRoles;
    verification_status_id?: string;
    notes?: string;
    [key: string]: any;
  };
  hasNotes?: boolean;
  onNotesClick?: () => void;
  /** If true, clicking on name navigates to fullscreen page */
  linkToFullscreen?: boolean;
}

/**
 * ContactName - Displays contact name and details
 *
 * Based on Angular: libs/schema/domain/contact/lib/contact-name/contact-name.component.ts
 * Shows: country, name, verification status, roles (Breeder/Judge)
 *
 * Data sources:
 * - name, slug, contact_roles, verification_status_id: direct from entity
 * - country: useDictionaryValue by country_id → country table
 */
export function ContactName({
  entity,
  hasNotes = false,
  onNotesClick,
  linkToFullscreen = true,
}: ContactNameProps) {
  // Enrich country from dictionary
  const countryName = useDictionaryValue("country", entity?.country_id);

  // Extract data from entity
  const displayName = entity?.name?.trim() || "Unknown";
  const slug = entity?.slug;

  // Roles from contact_roles JSONB field
  const roles = entity?.contact_roles || {};
  const isBreeder = !!roles.breeder;
  const isJudge = !!roles.judge;

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
          status={entity?.verification_status_id}
          size={16}
          mode="page"
        />

        {/* Note flag */}
        <NoteFlagButton
          hasNotes={hasNotes || !!entity?.notes}
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
