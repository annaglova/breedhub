import { NoteFlagButton } from "@ui/components/note-flag-button";
import { Link } from "react-router-dom";

// Breed reference in litter
interface LitterBreed {
  id?: string;
  name: string;
  url?: string;
  slug?: string;
}

// Kennel reference in litter
interface LitterKennel {
  id?: string;
  name: string;
  url?: string;
  slug?: string;
}

// Status reference
interface LitterStatus {
  id?: string;
  name?: string;
}

// Federation reference
interface LitterFederation {
  id?: string;
  name?: string;
  alternativeName?: string;
}

interface LitterNameProps {
  entity?: any;
  hasNotes?: boolean;
  onNotesClick?: () => void;
  /** If true, clicking on name navigates to fullscreen page */
  linkToFullscreen?: boolean;
}

// Mock data for visual development
const MOCK_LITTER = {
  name: "A-litter vom Königsberg",
  slug: "a-litter-vom-konigsberg",
  breeds: [
    { id: "1", name: "German Shepherd", slug: "german-shepherd" },
    { id: "2", name: "Belgian Malinois", slug: "belgian-malinois" },
  ] as LitterBreed[],
  status: { id: "1", name: "Born" } as LitterStatus,
  kennel: {
    id: "1",
    name: "Königsberg Kennel",
    slug: "konigsberg-kennel",
  } as LitterKennel,
  federation: {
    id: "1",
    name: "FCI",
    alternativeName: "FCI",
  } as LitterFederation,
  hasNotes: true,
};

/**
 * EntityLink - Renders a link to an entity (breed, kennel) or plain text
 */
function EntityLink({
  entity,
  className = "",
}: {
  entity?: { name: string; url?: string; slug?: string };
  className?: string;
}) {
  if (!entity) return null;

  const url = entity.slug ? `/${entity.slug}` : entity.url;

  if (url) {
    return (
      <Link to={url} className={`hover:underline ${className}`}>
        {entity.name}
      </Link>
    );
  }

  return <span className={className}>{entity.name}</span>;
}

/**
 * LitterName - Displays litter name and details
 *
 * Based on Angular: libs/schema/domain/litter/lib/litter-name/litter-name.component.ts
 * Shows: breed links (multiple), litter name, status, kennel, federation
 */
export function LitterName({
  entity,
  hasNotes = false,
  onNotesClick,
  linkToFullscreen = true,
}: LitterNameProps) {
  // Use entity data or fallback to mock for development
  const litter = entity || MOCK_LITTER;

  // Extract data - support both camelCase and snake_case
  const displayName = litter.name || litter.Name || "Unknown Litter";
  const slug = litter.slug || litter.Slug;
  const breeds: LitterBreed[] =
    litter.breeds || litter.LitterBreeds || MOCK_LITTER.breeds;
  const status: LitterStatus | undefined =
    litter.status || litter.Status || MOCK_LITTER.status;
  const kennel: LitterKennel | undefined =
    litter.kennel || litter.Kennel || MOCK_LITTER.kennel;
  const federation: LitterFederation | undefined =
    litter.federation || litter.Federation || MOCK_LITTER.federation;
  const hasNotesFlag = hasNotes || litter.hasNotes || litter.HasNotes;

  return (
    <div className="pb-3 cursor-default">
      {/* Breeds section - multiple breeds separated by bullets */}
      {breeds && breeds.length > 0 && (
        <div className="text-md mb-3 flex flex-wrap items-center space-x-1">
          {/* First breed - no bullet before */}
          <EntityLink entity={breeds[0]} className="uppercase" />

          {/* Rest of breeds - with bullet before each */}
          {breeds.slice(1).map((breed) => (
            <div key={breed.id || breed.name} className="flex space-x-1">
              <span className="text-primary">&bull;</span>
              <EntityLink entity={breed} className="uppercase" />
            </div>
          ))}
        </div>
      )}

      {/* Litter name with note flag */}
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

        {/* Note flag button */}
        <NoteFlagButton
          hasNotes={hasNotesFlag}
          onClick={onNotesClick}
          mode="page"
          className="self-start pr-7"
        />
      </div>

      {/* Info row: status, kennel, federation */}
      <div className="flex items-center">
        <div className="text-secondary flex flex-wrap items-center space-x-2 font-medium">
          {/* Color indicator (like in PetName) */}
          <div className="bg-primary-300 dark:bg-surface-400 size-4 rounded-full" />

          {/* Status - no bullet before first item */}
          {status?.name && (
            <div className="flex items-center">
              <span>{status.name}</span>
            </div>
          )}

          {/* Kennel - with bullet before */}
          {kennel?.name && (
            <div className="flex items-center">
              <span className="mr-2">&bull;</span>
              <EntityLink entity={kennel} />
            </div>
          )}

          {/* Federation - with bullet before */}
          {federation?.alternativeName && (
            <div className="flex items-center">
              <span className="mr-2">&bull;</span>
              <span>{federation.alternativeName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
