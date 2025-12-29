import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";

/**
 * Health exam entry
 */
interface HealthExam {
  id: string;
  date: string;
  healthExamObject?: {
    name?: string;
  };
  healthExamResult?: {
    name?: string;
  };
}

// Mock data for visual development
const MOCK_RESULTS: HealthExam[] = [
  {
    id: "1",
    date: "2024-01-15",
    healthExamObject: { name: "Hip Dysplasia (HD)" },
    healthExamResult: { name: "A (Excellent)" },
  },
  {
    id: "2",
    date: "2024-01-15",
    healthExamObject: { name: "Elbow Dysplasia (ED)" },
    healthExamResult: { name: "0 (Normal)" },
  },
  {
    id: "3",
    date: "2023-11-20",
    healthExamObject: { name: "Eye Examination" },
    healthExamResult: { name: "Clear" },
  },
  {
    id: "4",
    date: "2023-10-05",
    healthExamObject: { name: "Heart Examination" },
    healthExamResult: { name: "Normal" },
  },
  {
    id: "5",
    date: "2023-08-12",
    healthExamObject: { name: "DM (Degenerative Myelopathy)" },
    healthExamResult: { name: "N/N (Clear)" },
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

interface PetHealthTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * PetHealthTab - Pet health exam results
 *
 * Displays a table with:
 * - Date (hidden on mobile)
 * - Object (exam type)
 * - Result
 *
 * Based on Angular: pet-health.component.ts
 */
export function PetHealthTab({ onLoadedCount }: PetHealthTabProps) {
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
              "grid gap-3 border-b border-border px-6 py-3 font-bold text-secondary lg:px-8",
              isFullscreen
                ? "grid-cols-[132px_184px_auto] lg:grid-cols-[132px_284px_auto]"
                : "grid-cols-[132px_auto] sm:grid-cols-[184px_auto] md:grid-cols-[86px_184px_auto]"
            )}
          >
            <div className={cn("hidden", isFullscreen ? "block" : "md:block")}>
              Date
            </div>
            <div>Object</div>
            <div>Result</div>
          </div>

          {/* Rows */}
          {results.map((healthExam, index) => (
            <div
              key={healthExam.id}
              className={cn(
                "grid items-center gap-3 px-6 py-2 lg:px-8",
                isFullscreen
                  ? "grid-cols-[132px_184px_auto] lg:grid-cols-[132px_284px_auto]"
                  : "grid-cols-[132px_auto] sm:grid-cols-[184px_auto] md:grid-cols-[86px_184px_auto]",
                index % 2 === 0 ? "bg-card-ground" : "bg-even-card-ground"
              )}
            >
              {/* Date */}
              <div className={cn("hidden", isFullscreen ? "block" : "md:block")}>
                {formatDate(healthExam.date)}
              </div>

              {/* Object */}
              <div className="truncate">
                {healthExam.healthExamObject?.name}
              </div>

              {/* Result */}
              <div className="truncate">
                {healthExam.healthExamResult?.name}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-secondary p-8 text-center font-medium">
          There are no health results!
        </span>
      )}
    </div>
  );
}
