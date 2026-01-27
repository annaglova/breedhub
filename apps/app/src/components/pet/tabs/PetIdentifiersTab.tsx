import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore, useTabData } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";

/**
 * Pet identifier (microchip, registration, etc.)
 */
interface PetIdentifier {
  id: string;
  typeName: string;
  value: string;
}

interface PetIdentifiersTabProps {
  onLoadedCount?: (count: number) => void;
  dataSource?: DataSourceConfig;
}

/**
 * PetIdentifiersTab - Pet identifiers (microchips, registrations, etc.)
 *
 * Displays a table with:
 * - Identifier type name
 * - Identifier value
 *
 * Data flow:
 * - Uses VIEW pet_identifier_with_type which:
 *   - JOINs pet_identifier with pet_identifier_type
 *   - Filters by is_public = true (hides private/parsing data)
 *   - Includes type_name directly
 *
 * Based on Angular: pet-identifiers.component.ts
 */
export function PetIdentifiersTab({
  onLoadedCount,
  dataSource,
}: PetIdentifiersTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const petId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value;

  // Load identifiers via useTabData (VIEW includes type_name, no lookup needed)
  const {
    data: identifiersRaw,
    isLoading,
    error,
  } = useTabData({
    parentId: petId,
    dataSource: dataSource!,
    enabled: !!dataSource && !!petId,
  });

  // Transform raw data to UI format
  const identifiers = useMemo<PetIdentifier[]>(() => {
    if (!identifiersRaw || identifiersRaw.length === 0) return [];

    return identifiersRaw.map((item: any) => ({
      id: item.id,
      typeName: item.type_name || item.additional?.type_name || "Unknown",
      value: item.value || item.additional?.value || "",
    }));
  }, [identifiersRaw]);

  // Report count after data loads
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(identifiers.length);
    }
  }, [isLoading, onLoadedCount, identifiers.length]);

  // Don't render if no dataSource configured
  if (!dataSource) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="py-4 px-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-secondary">Loading identifiers...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-4 px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">Failed to load identifiers</p>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

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
        <span className="text-secondary p-8 text-center ">
          There are no pet identifiers!
        </span>
      )}
    </div>
  );
}
