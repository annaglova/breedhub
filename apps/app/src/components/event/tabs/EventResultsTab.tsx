import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { ExternalLink } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * Pet reference
 */
interface Pet {
  id?: string;
  name: string;
  url?: string;
  slug?: string;
}

/**
 * Judge reference
 */
interface Judge {
  id?: string;
  name: string;
  url?: string;
  slug?: string;
}

/**
 * Competition class
 */
interface CompetitionClass {
  id?: string;
  name: string;
}

/**
 * Competitor entry
 */
interface Competitor {
  id?: string;
  pet: Pet;
  class?: CompetitionClass;
  number?: string;
  result?: string;
  judge?: Judge;
  webLink?: string;
}

/**
 * Breed with competitors
 */
interface BreedResults {
  id?: string;
  name: string;
  competitors: Competitor[];
}

// Mock data for visual development
const MOCK_DATA: BreedResults[] = [
  {
    id: "breed-1",
    name: "German Shepherd",
    competitors: [
      {
        id: "comp-1",
        pet: { id: "pet-1", name: "Rex vom Königsberg", slug: "rex-vom-konigsberg" },
        class: { id: "class-1", name: "Champion" },
        number: "125",
        result: "V1, CAC, CACIB, BOB",
        judge: { id: "judge-1", name: "Hans Mueller", slug: "hans-mueller" },
        webLink: "https://example.com/results/125",
      },
      {
        id: "comp-2",
        pet: { id: "pet-2", name: "Luna von Berlin", slug: "luna-von-berlin" },
        class: { id: "class-2", name: "Open" },
        number: "126",
        result: "V2, R.CAC",
        judge: { id: "judge-1", name: "Hans Mueller", slug: "hans-mueller" },
        webLink: "https://example.com/results/126",
      },
      {
        id: "comp-3",
        pet: { id: "pet-3", name: "Max aus Wien", slug: "max-aus-wien" },
        class: { id: "class-3", name: "Intermediate" },
        number: "127",
        result: "V3",
        judge: { id: "judge-2", name: "Maria Schmidt", slug: "maria-schmidt" },
      },
    ],
  },
  {
    id: "breed-2",
    name: "Belgian Malinois",
    competitors: [
      {
        id: "comp-4",
        pet: { id: "pet-4", name: "Apollo vom Rhein", slug: "apollo-vom-rhein" },
        class: { id: "class-1", name: "Champion" },
        number: "201",
        result: "V1, CAC, CACIB, BOB",
        judge: { id: "judge-3", name: "Klaus Weber", slug: "klaus-weber" },
        webLink: "https://example.com/results/201",
      },
      {
        id: "comp-5",
        pet: { id: "pet-5", name: "Bella de Bruxelles", slug: "bella-de-bruxelles" },
        class: { id: "class-2", name: "Open" },
        number: "202",
        result: "V1, CAC",
        judge: { id: "judge-3", name: "Klaus Weber", slug: "klaus-weber" },
      },
    ],
  },
];

/**
 * EntityLink - Link to entity with role-based styling
 */
function EntityLink({
  entity,
  entityRole,
}: {
  entity?: { name: string; url?: string; slug?: string };
  entityRole: "pet" | "judge";
}) {
  if (!entity) return <span className="text-muted-foreground">—</span>;

  const url = entity.slug ? `/${entity.slug}` : entity.url;

  if (url) {
    return (
      <Link
        to={url}
        className={cn(
          "hover:underline",
          entityRole === "pet" && "text-pet",
          entityRole === "judge" && "text-contact"
        )}
      >
        {entity.name}
      </Link>
    );
  }

  return <span>{entity.name}</span>;
}

/**
 * ExternalLinkButton - External link with icon
 */
function ExternalLinkButton({ url }: { url?: string }) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-primary transition-colors"
    >
      <ExternalLink size={16} />
    </a>
  );
}

interface EventResultsTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * EventResultsTab - Event competition results
 *
 * Displays results grouped by breed, showing:
 * - Pet name (link)
 * - Class name (fullscreen only)
 * - Number (fullscreen only)
 * - Result
 * - Judge (fullscreen only)
 * - External link
 *
 * Based on Angular: event-results.component.ts
 */
export function EventResultsTab({ onLoadedCount }: EventResultsTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;

  // TODO: Load real data from entity when available
  // For now always using mock data for visual development
  const breeds: BreedResults[] = MOCK_DATA;

  // Count total competitors
  const totalCompetitors = breeds.reduce(
    (sum, breed) => sum + breed.competitors.length,
    0
  );

  // Report loaded count
  useEffect(() => {
    if (onLoadedCount) {
      onLoadedCount(totalCompetitors);
    }
  }, [onLoadedCount, totalCompetitors]);

  if (breeds.length === 0) {
    return (
      <div className="text-secondary p-8 text-center">
        No results available
      </div>
    );
  }

  return (
    <div className="px-6 cursor-default">
      {breeds.map((breed) => (
        <div key={breed.id || breed.name} className="mt-3">
          {/* Breed header */}
          <div className="bg-secondary-100 w-full rounded-full px-4 py-2.5">
            {breed.name}
          </div>

          {/* Competitors */}
          {breed.competitors.map((competitor) => (
            <div
              key={competitor.id}
              className={cn(
                "mt-4 grid w-full items-center gap-3 px-4 pb-2",
                isFullscreen
                  ? "grid-cols-[1fr_84px_24px] lg:grid-cols-[1fr_100px_60px_120px_100px_24px]"
                  : "grid-cols-[1fr_84px_24px] sm:grid-cols-[1fr_204px_24px] md:grid-cols-[1fr_124px_24px]"
              )}
            >
              {/* Pet name */}
              <div className="flex min-h-10 items-center">
                <EntityLink entity={competitor.pet} entityRole="pet" />
              </div>

              {/* Class - fullscreen lg+ only */}
              {isFullscreen && (
                <span className="hidden lg:block">
                  {competitor.class?.name}
                </span>
              )}

              {/* Number - fullscreen lg+ only */}
              {isFullscreen && (
                <span className="hidden lg:block">
                  {competitor.number}
                </span>
              )}

              {/* Result */}
              <div className="flex items-center">
                <span>{competitor.result}</span>
              </div>

              {/* Judge - fullscreen lg+ only */}
              {isFullscreen && (
                <div className="hidden lg:flex items-center">
                  <EntityLink entity={competitor.judge} entityRole="judge" />
                </div>
              )}

              {/* External link */}
              <ExternalLinkButton url={competitor.webLink} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
