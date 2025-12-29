import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { ExternalLink } from "lucide-react";

/**
 * Show result entry
 */
interface ShowResult {
  id: string;
  date: string;
  project?: {
    countryCode?: string;
    cityName?: string;
    category?: string;
  };
  result: string;
  judge?: {
    name?: string;
  };
  webLink?: string;
}

// Mock data for visual development
const MOCK_RESULTS: ShowResult[] = [
  {
    id: "1",
    date: "2024-03-15",
    project: {
      countryCode: "DE",
      cityName: "Berlin",
      category: "CAC",
    },
    result: "V1, CAC, CACIB, BOB",
    judge: {
      name: "Hans Mueller",
    },
    webLink: "https://example.com/show/1",
  },
  {
    id: "2",
    date: "2024-02-20",
    project: {
      countryCode: "AT",
      cityName: "Vienna",
      category: "CAC",
    },
    result: "V1, CAC, R.CACIB",
    judge: {
      name: "Maria Schmidt",
    },
    webLink: "https://example.com/show/2",
  },
  {
    id: "3",
    date: "2024-01-10",
    project: {
      countryCode: "CZ",
      cityName: "Prague",
      category: "CAC",
    },
    result: "V2, R.CAC",
    judge: {
      name: "Jan Novak",
    },
  },
  {
    id: "4",
    date: "2023-12-05",
    project: {
      countryCode: "PL",
      cityName: "Warsaw",
      category: "CAC",
    },
    result: "V1, CAC, BOS",
    judge: {
      name: "Anna Kowalska",
    },
    webLink: "https://example.com/show/4",
  },
];

/**
 * Format date to locale string
 */
function formatDate(dateString?: string): string {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

interface PetShowResultsTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * PetShowResultsTab - Pet show results
 *
 * Displays a table with:
 * - Date
 * - Show (country, city, category) - visible in fullscreen
 * - Result
 * - Judge - visible in fullscreen
 * - Details (external link)
 *
 * Based on Angular: pet-show-results.component.ts
 */
export function PetShowResultsTab({ onLoadedCount }: PetShowResultsTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;

  // TODO: Load real data from entity
  // For now using mock data
  const results = MOCK_RESULTS;

  return (
    <div className="card mt-3 flex flex-auto flex-col p-6 lg:px-8 cursor-default">
      {results.length > 0 ? (
        <div className="grid">
          {/* Header */}
          <div
            className={cn(
              "grid gap-3 border-b border-border px-6 py-3 font-bold text-secondary md:px-8",
              isFullscreen
                ? "grid-cols-[132px_auto_44px] lg:grid-cols-[132px_226px_auto_176px_44px]"
                : "grid-cols-[132px_auto_44px]"
            )}
          >
            <span>Date</span>
            <span className={cn("hidden", isFullscreen && "lg:block")}>
              Show
            </span>
            <span>Result</span>
            <span className={cn("hidden", isFullscreen && "lg:block")}>
              Judge
            </span>
            <span>Details</span>
          </div>

          {/* Rows */}
          {results.map((showResult, index) => (
            <div
              key={showResult.id}
              className={cn(
                "grid items-center gap-3 rounded-md px-6 py-2 md:px-8",
                isFullscreen
                  ? "grid-cols-[132px_auto_44px] lg:grid-cols-[132px_226px_auto_176px_44px]"
                  : "grid-cols-[132px_auto_44px]",
                index % 2 === 0 ? "bg-card-ground" : "bg-even-card-ground"
              )}
            >
              {/* Date */}
              <span>{formatDate(showResult.date)}</span>

              {/* Show */}
              <span
                className={cn("hidden truncate", isFullscreen && "lg:block")}
              >
                {[
                  showResult.project?.countryCode,
                  showResult.project?.cityName,
                  showResult.project?.category,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </span>

              {/* Result */}
              <span className="truncate">{showResult.result}</span>

              {/* Judge */}
              <span
                className={cn("hidden truncate", isFullscreen && "lg:block")}
              >
                {showResult.judge?.name}
              </span>

              {/* Details link */}
              <div>
                {showResult.webLink && (
                  <a
                    href={showResult.webLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-secondary p-8 text-center font-medium">
          There are no show results!
        </span>
      )}
    </div>
  );
}
