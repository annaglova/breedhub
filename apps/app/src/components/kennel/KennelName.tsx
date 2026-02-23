import { useDictionaryValue } from "@/hooks/useDictionaryValue";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { NoteFlagButton } from "@ui/components/note-flag-button";
import { Link } from "react-router-dom";
import { dictionaryStore } from "@breedhub/rxdb-store";
import { useEffect, useState } from "react";

interface KennelNameProps {
  entity?: {
    name?: string;
    slug?: string;
    country_id?: string;
    verification_status_id?: string;
    owner_name?: string;
    federation_name?: string;
    company_foundation_date?: string;
    notes?: string;
    [key: string]: any;
  };
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

/**
 * KennelName - Displays kennel name and details
 *
 * Data sources:
 * - name, slug, owner_name, federation_name, verification_status_id: direct from entity
 * - country: useDictionaryValue by country_id → country table
 */
export function KennelName({
  entity,
  hasNotes = false,
  onNotesClick,
  linkToFullscreen = true,
}: KennelNameProps) {
  // Enrich country from dictionary
  const countryName = useDictionaryValue("country", entity?.country_id);

  // Resolve owner from owner_id for link
  const [ownerSlug, setOwnerSlug] = useState<string | undefined>();
  useEffect(() => {
    const ownerId = entity?.owner_id as string | undefined;
    if (ownerId) {
      dictionaryStore.getRecordById("contact", ownerId).then((record) => {
        setOwnerSlug(record?.slug ? String(record.slug) : undefined);
      });
    } else {
      setOwnerSlug(undefined);
    }
  }, [entity?.owner_id]);

  const displayName = entity?.name?.trim() || "Unknown Kennel";
  const ownerName = entity?.owner_name || "";
  const federationName = entity?.federation_name || "";
  const foundationYear = formatYear(entity?.company_foundation_date);

  return (
    <div className="pb-3 cursor-default">
      {/* Country */}
      <div className="text-md mb-2 min-h-[1.5rem]">
        {countryName && (
          <span className="uppercase">{countryName}</span>
        )}
      </div>

      {/* Kennel name with verification and note flag */}
      <div className="flex space-x-1.5">
        <div className="truncate py-0.5 text-2xl sm:text-3xl font-bold">
          {linkToFullscreen && entity?.slug ? (
            <Link
              to={`/${entity.slug}`}
              className="text-foreground hover:text-primary cursor-pointer"
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

      {/* Additional info: owner, federation, since */}
      <div className="flex items-center">
        <div className="text-secondary flex flex-wrap items-center space-x-2 font-medium">
          {/* Placeholder circle (like sex mark in PetName) */}
          <div className="bg-primary-300 dark:bg-surface-400 size-4 rounded-full" />

          {/* Owner */}
          {ownerName && (
            ownerSlug ? (
              <Link to={`/${ownerSlug}`} className="text-foreground hover:text-primary">
                {ownerName}
              </Link>
            ) : (
              <span>{ownerName}</span>
            )
          )}

          {/* Federation - hidden on small mobile */}
          {federationName && (
            <div className="hidden xs:flex items-center">
              {ownerName && <span className="mr-2">&bull;</span>}
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
