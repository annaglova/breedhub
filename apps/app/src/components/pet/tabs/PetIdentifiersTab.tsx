import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore, useTabData, dictionaryStore } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/**
 * Pet identifier (microchip, registration, etc.)
 */
interface PetIdentifier {
  id: string;
  typeId: string;
  typeName: string;
  value: string;
}

// Default dataSource config for identifiers
const DEFAULT_IDENTIFIERS_DATASOURCE: DataSourceConfig = {
  type: "child",
  childTable: {
    table: "pet_identifier",
    parentField: "pet_id",
  },
};

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
 * Data flow (Pattern B - Child Records + Lookups):
 * 1. Load child records via useTabData (pet_identifier)
 * 2. Extract unique pet_identifier_type_id values
 * 3. Load only needed types via dictionaryStore.getRecordById
 * 4. Merge and render
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

  // Lookup map state
  const [identifierTypesMap, setIdentifierTypesMap] = useState<Map<string, any>>(new Map());
  const [lookupsLoading, setLookupsLoading] = useState(false);

  // Load identifiers via useTabData
  const {
    data: identifiersRaw,
    isLoading: identifiersLoading,
    error: identifiersError,
  } = useTabData({
    parentId: petId,
    dataSource: dataSource || DEFAULT_IDENTIFIERS_DATASOURCE,
    enabled: !!petId,
  });

  // Load lookups by specific IDs from child records
  useEffect(() => {
    if (identifiersLoading) return;
    if (!identifiersRaw?.length) {
      setLookupsLoading(false);
      return;
    }

    async function loadLookupsByIds() {
      setLookupsLoading(true);

      try {
        // Ensure dictionaryStore is initialized
        if (!dictionaryStore.initialized.value) {
          await dictionaryStore.initialize();
        }

        // Extract unique type IDs from child records
        const typeIds = new Set<string>();

        identifiersRaw.forEach((item: any) => {
          const typeId = item.additional?.pet_identifier_type_id || item.pet_identifier_type_id;
          if (typeId) typeIds.add(typeId);
        });

        // Load only needed records in parallel
        const lookupPromises: Promise<[string, any]>[] = [];

        typeIds.forEach(id => {
          lookupPromises.push(
            dictionaryStore.getRecordById("pet_identifier_type", id)
              .then(record => [id, record] as [string, any])
          );
        });

        const results = await Promise.all(lookupPromises);

        // Build map from results
        const newTypesMap = new Map<string, any>();
        results.forEach(([id, record]) => {
          if (record) newTypesMap.set(id, record);
        });

        setIdentifierTypesMap(newTypesMap);
      } catch (error) {
        console.error("[PetIdentifiersTab] Failed to load lookups:", error);
      } finally {
        setLookupsLoading(false);
      }
    }

    loadLookupsByIds();
  }, [identifiersRaw, identifiersLoading]);

  // Transform raw data to UI format
  const identifiers = useMemo<PetIdentifier[]>(() => {
    if (!identifiersRaw || identifiersRaw.length === 0 || lookupsLoading) return [];

    return identifiersRaw.map((item: any) => {
      const typeId = item.additional?.pet_identifier_type_id || item.pet_identifier_type_id;
      const identifierType = identifierTypesMap.get(typeId);

      return {
        id: item.id,
        typeId,
        typeName: identifierType?.name || "Unknown",
        value: item.additional?.value || item.value || "",
      };
    });
  }, [identifiersRaw, identifierTypesMap, lookupsLoading]);

  const isLoading = identifiersLoading || lookupsLoading;

  // Report count after data loads
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(identifiers.length);
    }
  }, [isLoading, onLoadedCount, identifiers.length]);

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
  if (identifiersError) {
    return (
      <div className="py-4 px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">Failed to load identifiers</p>
          <p className="text-red-600 text-sm mt-1">{identifiersError.message}</p>
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
