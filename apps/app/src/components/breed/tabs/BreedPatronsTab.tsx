import { useMemo } from "react";
import { AvatarCard, AvatarEntity } from "@/components/shared/AvatarCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore, useTabData } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { Loader2 } from "lucide-react";

/**
 * Raw patron data from VIEW (top_patron_in_breed_with_contact)
 */
interface PatronViewRecord {
  id: string;
  breed_id: string;
  contact_id: string;
  placement: number;
  rating?: number;
  period_start: string;
  period_end: string;
  contact?: {
    id: string;
    name: string;
    slug: string;
    avatar_url?: string;
  };
}

interface BreedPatronsTabProps {
  recordsCount?: number;
  dataSource?: DataSourceConfig;
}

/**
 * BreedPatronsTab - Top patrons grid
 *
 * Displays breed patrons in a grid with placement badges.
 *
 * Data flow (Config-Driven, Local-First):
 * 1. dataSource config defines VIEW to load
 * 2. useTabData → TabDataService → SpaceStore → RxDB
 * 3. VIEW pre-joins contact data as JSONB
 * 4. Component transforms to AvatarEntity format
 *
 * Grid columns:
 * - Default (drawer): 2 cols → sm:3 cols
 * - Fullscreen: 2 cols → sm:3 cols → lg:4 cols → xxl:5 cols
 *
 * @see docs/TAB_DATA_SERVICE_ARCHITECTURE.md
 */
export function BreedPatronsTab({ dataSource }: BreedPatronsTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const breedId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value;

  // Load data via useTabData (config-driven, local-first)
  // TabDataService routes to SpaceStore.loadChildRecords()
  const { data, isLoading, error } = useTabData<PatronViewRecord>({
    parentId: breedId,
    dataSource: dataSource!,
    enabled: !!dataSource && !!breedId,
  });

  // Transform VIEW data to AvatarEntity format
  const patrons = useMemo<AvatarEntity[]>(() => {
    if (!data || data.length === 0) return [];

    return data.map((record) => {
      // Contact data is embedded as JSONB in VIEW
      // For child records, data is in `additional` field
      const contact = record.contact || (record as any).additional?.contact;
      const placement = record.placement ?? (record as any).additional?.placement;

      return {
        id: contact?.id || record.contact_id || record.id,
        name: contact?.name || "Unknown",
        avatarUrl: contact?.avatar_url || "",
        place: placement,
        url: contact?.slug ? `/${contact.slug}` : `/contact/${contact?.id || record.contact_id}`,
      };
    });
  }, [data]);

  // No dataSource config - show warning
  if (!dataSource) {
    return (
      <div className="py-4 px-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700 font-semibold">
            Missing dataSource configuration
          </p>
          <p className="text-yellow-600 text-sm mt-1">
            Add dataSource to tab config to enable data loading
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="py-4 px-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-secondary">Loading patrons...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-4 px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">Failed to load patrons</p>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (patrons.length === 0) {
    return (
      <div className="card mt-5 flex flex-auto flex-col p-6 lg:px-8">
        <span className="text-muted-foreground p-8 text-center font-medium">
          There are no patrons in Breed!
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mt-3 grid grid-cols-2 gap-y-6 sm:grid-cols-3",
        // In fullscreen mode, show more columns on larger screens
        isFullscreen && "lg:grid-cols-4 xxl:grid-cols-5"
      )}
    >
      {patrons.map((patron) => (
        <AvatarCard
          key={patron.id}
          entity={patron}
          model="contact"
        />
      ))}
    </div>
  );
}
