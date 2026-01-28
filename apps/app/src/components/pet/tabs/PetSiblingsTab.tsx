import { PetLinkRow } from "@/components/shared/PetLinkRow";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore, useTabData } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";

/**
 * Sibling pet (UI format)
 */
interface SiblingPet {
  id: string;
  name: string;
  url?: string;
  sex?: {
    code?: string;
    name?: string;
  };
  dateOfBirth?: string;
}

/**
 * Sibling group (siblings grouped by DOB)
 */
interface SiblingGroup {
  date?: string;
  pets: SiblingPet[];
}

/**
 * Group siblings by date of birth
 */
function groupSiblingsByDate(siblings: SiblingPet[]): SiblingGroup[] {
  const grouped: SiblingGroup[] = [];

  // Sort by date (newest first, nulls at the end)
  const sorted = [...siblings].sort((a, b) => {
    if (!a.dateOfBirth && !b.dateOfBirth) return 0;
    if (!a.dateOfBirth) return 1; // a is null, put after b
    if (!b.dateOfBirth) return -1; // b is null, put after a
    return (
      new Date(b.dateOfBirth).getTime() - new Date(a.dateOfBirth).getTime()
    );
  });

  sorted.forEach((pet) => {
    const existingGroup = grouped.find((g) => g.date === pet.dateOfBirth);

    if (existingGroup) {
      existingGroup.pets.push(pet);
    } else {
      grouped.push({
        date: pet.dateOfBirth,
        pets: [pet],
      });
    }
  });

  // Sort pets within each group (males first)
  grouped.forEach((group) => {
    group.pets.sort((a, b) => (b.sex?.code === "male" ? 1 : -1));
  });

  return grouped;
}

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

interface PetSiblingsTabProps {
  onLoadedCount?: (count: number) => void;
  dataSource?: DataSourceConfig;
}

/**
 * PetSiblingsTab - Pet's siblings (brothers/sisters)
 *
 * Displays siblings grouped by DOB:
 * - Header: DOB date
 * - Rows: sex mark, sex name, link to sibling
 *
 * Based on Angular: pet-siblings.component.ts
 */
export function PetSiblingsTab({
  onLoadedCount,
  dataSource,
}: PetSiblingsTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const petId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value;

  // Load siblings via useTabData (VIEW with self-join on pet table)
  const {
    data: siblingsRaw,
    isLoading,
    error,
  } = useTabData({
    parentId: petId,
    dataSource: dataSource!,
    enabled: !!dataSource && !!petId,
  });

  // Transform raw data to UI format
  const siblings = useMemo<SiblingPet[]>(() => {
    if (!siblingsRaw || siblingsRaw.length === 0) return [];

    return siblingsRaw.map((item: any) => ({
      id: item.id,
      name: item.name || item.additional?.name || "",
      url: item.slug || item.additional?.slug,
      sex: {
        code: item.sex_code || item.additional?.sex_code,
        name: item.sex_name || item.additional?.sex_name,
      },
      dateOfBirth: item.date_of_birth || item.additional?.date_of_birth,
    }));
  }, [siblingsRaw]);

  // Group siblings by date
  const siblingGroups = useMemo(() => {
    return groupSiblingsByDate(siblings);
  }, [siblings]);

  // Report count after data loads
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(siblings.length);
    }
  }, [isLoading, onLoadedCount, siblings.length]);

  // Don't render if no dataSource configured
  if (!dataSource) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="py-4 px-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-secondary">Loading siblings...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-4 px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">Failed to load siblings</p>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {siblingGroups.length > 0 ? (
        <div
          className={cn(
            "grid flex-col-reverse gap-3",
            isFullscreen && "lg:grid-cols-2"
          )}
        >
          {siblingGroups.map((group, groupIndex) => (
            <div
              key={group.date || groupIndex}
              className="card card-rounded flex flex-auto flex-col p-6 md:px-10"
            >
              {/* Group header - DOB date */}
              <div className="grid gap-3 border-b border-border px-6 py-3 font-semibold lg:px-8">
                <div>{formatDate(group.date)}</div>
              </div>

              {/* Sibling rows */}
              {group.pets.map((sibling) => (
                <PetLinkRow
                  key={sibling.id}
                  id={sibling.id}
                  name={sibling.name}
                  url={sibling.url}
                  sex={sibling.sex}
                  gridCols={
                    isFullscreen
                      ? "grid-cols-[82px_auto] lg:grid-cols-[64px_auto]"
                      : "grid-cols-[28px_auto] sm:grid-cols-[72px_auto] md:grid-cols-[82px_auto]"
                  }
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="card card-rounded flex flex-auto flex-col p-6 lg:px-8">
          <span className="text-secondary p-8 text-center ">
            There are no siblings!
          </span>
        </div>
      )}
    </>
  );
}
