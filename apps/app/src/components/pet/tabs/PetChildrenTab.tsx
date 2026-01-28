import { LitterCard, LitterData } from "@/components/shared/LitterCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import { spaceStore, useTabData } from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";

/**
 * Group children into litters by date + other parent
 */
function groupChildrenIntoLitters(
  children: Array<{
    id: string;
    name: string;
    slug?: string;
    date_of_birth?: string;
    sex_code?: string;
    sex_name?: string;
    parent_role?: string;
    other_parent_id?: string;
    other_parent_name?: string;
    other_parent_slug?: string;
  }>
): { litters: LitterData[]; parentRole: string | null } {
  if (!children.length) return { litters: [], parentRole: null };

  // Get parent role from first child (should be same for all)
  const parentRole = children[0]?.parent_role || null;

  // Group by date + other_parent_id
  const grouped = new Map<string, LitterData>();

  for (const child of children) {
    const key = `${child.date_of_birth || "unknown"}:${child.other_parent_id || "unknown"}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        date: child.date_of_birth || "",
        anotherParent: {
          name: child.other_parent_name,
          url: child.other_parent_slug,
        },
        pets: [],
      });
    }

    grouped.get(key)!.pets.push({
      id: child.id,
      name: child.name || "",
      url: child.slug,
      sex: {
        code: child.sex_code,
        name: child.sex_name,
      },
    });
  }

  // Sort litters by date (newest first, nulls at the end)
  const litters = Array.from(grouped.values()).sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1; // a is null, put after b
    if (!b.date) return -1; // b is null, put after a
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Sort pets within each litter (males first)
  litters.forEach((litter) => {
    litter.pets.sort((a, b) => (b.sex?.code === "male" ? 1 : -1));
  });

  return { litters, parentRole };
}

interface PetChildrenTabProps {
  onLoadedCount?: (count: number) => void;
  dataSource?: DataSourceConfig;
}

/**
 * PetChildrenTab - Pet's offspring grouped by litter
 *
 * Displays litters (children grouped by DOB and other parent):
 * - Header: DOB date + link to other parent (Father/Mother)
 * - Rows: sex mark, sex name, "for sale" badge, link to child
 *
 * Based on Angular: pet-children.component.ts
 */
export function PetChildrenTab({
  onLoadedCount,
  dataSource,
}: PetChildrenTabProps) {
  useSignals();

  const selectedEntity = useSelectedEntity();
  const petId = selectedEntity?.id;
  const isFullscreen = spaceStore.isFullscreen.value;

  // Load children via useTabData (VIEW with UNION for father/mother)
  const {
    data: childrenRaw,
    isLoading,
    error,
  } = useTabData({
    parentId: petId,
    dataSource: dataSource!,
    enabled: !!dataSource && !!petId,
  });

  // Transform and group children into litters
  const { litters, parentRole } = useMemo(() => {
    if (!childrenRaw || childrenRaw.length === 0) {
      return { litters: [], parentRole: null };
    }

    const children = childrenRaw.map((item: any) => ({
      id: item.id,
      name: item.name || item.additional?.name || "",
      slug: item.slug || item.additional?.slug,
      date_of_birth: item.date_of_birth || item.additional?.date_of_birth,
      sex_code: item.sex_code || item.additional?.sex_code,
      sex_name: item.sex_name || item.additional?.sex_name,
      parent_role: item.parent_role || item.additional?.parent_role,
      other_parent_id: item.other_parent_id || item.additional?.other_parent_id,
      other_parent_name: item.other_parent_name || item.additional?.other_parent_name,
      other_parent_slug: item.other_parent_slug || item.additional?.other_parent_slug,
    }));

    return groupChildrenIntoLitters(children);
  }, [childrenRaw]);

  // Determine label for the other parent based on current pet's role
  // If current pet is "father", other parent is "Mother" and vice versa
  const anotherParentRole = parentRole === "father" ? "Mother" : "Father";

  // Count total children across all litters
  const totalChildren = useMemo(() => {
    return litters.reduce((sum, litter) => sum + litter.pets.length, 0);
  }, [litters]);

  // Report count after data loads
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(totalChildren);
    }
  }, [isLoading, onLoadedCount, totalChildren]);

  // Don't render if no dataSource configured
  if (!dataSource) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="py-4 px-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-secondary">Loading children...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-4 px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-semibold">Failed to load children</p>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {litters.length > 0 ? (
        <div className={cn("grid gap-3", isFullscreen && "lg:grid-cols-2")}>
          {litters.map((litter, litterIndex) => (
            <LitterCard
              key={`${litter.date}-${litterIndex}`}
              litter={litter}
              anotherParentRole={anotherParentRole}
              isFullscreen={isFullscreen}
            />
          ))}
        </div>
      ) : (
        <div className="card card-rounded flex flex-auto flex-col p-6 lg:px-8">
          <span className="text-secondary p-8 text-center ">
            There are no children!
          </span>
        </div>
      )}
    </>
  );
}
