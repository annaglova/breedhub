import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";

/**
 * Pet identifier (microchip, registration, etc.)
 */
interface PetIdentifier {
  id: string;
  typeId: string;
  typeName: string;
  value: string;
}

// Mock data for visual development
const MOCK_IDENTIFIERS: PetIdentifier[] = [
  {
    id: "1",
    typeId: "microchip",
    typeName: "Microchip",
    value: "985121012345678",
  },
  {
    id: "2",
    typeId: "akc",
    typeName: "AKC Registration",
    value: "DN12345678",
  },
  {
    id: "3",
    typeId: "ukc",
    typeName: "UKC Registration",
    value: "P123-456",
  },
  {
    id: "4",
    typeId: "tattoo",
    typeName: "Tattoo",
    value: "ABC123",
  },
];

interface PetIdentifiersTabProps {
  onLoadedCount?: (count: number) => void;
}

/**
 * PetIdentifiersTab - Pet identifiers (microchips, registrations, etc.)
 *
 * Displays a table with:
 * - Identifier type name
 * - Identifier value
 *
 * Based on Angular: pet-identifiers.component.ts
 */
export function PetIdentifiersTab({ onLoadedCount }: PetIdentifiersTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const isFullscreen = spaceStore.isFullscreen.value;

  // TODO: Load real data from entity
  // For now using mock data
  const identifiers = MOCK_IDENTIFIERS;

  return (
    <div className="card card-rounded flex flex-auto flex-col p-6 lg:px-8 cursor-default">
      {identifiers.length > 0 ? (
        <div className="grid">
          {/* Header */}
          <div
            className={cn(
              "grid gap-3 border-b border-border px-6 py-3 font-bold text-secondary lg:px-8",
              isFullscreen
                ? "grid-cols-[184px_auto] lg:grid-cols-[284px_auto]"
                : "grid-cols-[120px_auto] sm:grid-cols-[184px_auto]"
            )}
          >
            <div>Identifier</div>
            <div>Value</div>
          </div>

          {/* Rows */}
          {identifiers.map((identifier, index) => (
            <div
              key={identifier.id}
              className={cn(
                "grid items-center gap-3 px-6 py-2 lg:px-8",
                isFullscreen
                  ? "grid-cols-[184px_auto] lg:grid-cols-[284px_auto]"
                  : "grid-cols-[120px_auto] sm:grid-cols-[184px_auto]",
                index % 2 === 0 ? "bg-card-ground" : "bg-even-card-ground"
              )}
            >
              {/* Identifier type */}
              <div>{identifier.typeName}</div>
              {/* Value */}
              <div className="font-mono">{identifier.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-secondary p-8 text-center font-medium">
          There are no pet identifiers!
        </span>
      )}
    </div>
  );
}
