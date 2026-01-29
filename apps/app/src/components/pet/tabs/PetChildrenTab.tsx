import { LitterCard, LitterData } from "@/components/shared/LitterCard";
import { useSelectedEntity } from "@/contexts/SpaceContext";
import {
  spaceStore,
  useInfiniteTabData,
  useTabData,
} from "@breedhub/rxdb-store";
import type { DataSourceConfig } from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { cn } from "@ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

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
    available_for_sale?: boolean;
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
      availableForSale: child.available_for_sale,
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

  // Drawer mode: load limited data
  const drawerResult = useTabData({
    parentId: petId,
    dataSource: dataSource!,
    enabled: !!dataSource && !!petId && !isFullscreen,
  });

  // Fullscreen mode: infinite scroll with pagination
  const infiniteResult = useInfiniteTabData({
    parentId: petId,
    dataSource: dataSource!,
    enabled: !!dataSource && !!petId && isFullscreen,
    pageSize: 30,
  });

  // Use appropriate data based on mode
  const childrenRaw = isFullscreen ? infiniteResult.data : drawerResult.data;
  const isLoading = isFullscreen
    ? infiniteResult.isLoading
    : drawerResult.isLoading;
  const error = isFullscreen ? infiniteResult.error : drawerResult.error;

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
      available_for_sale: item.available_for_sale || item.additional?.available_for_sale,
    }));

    return groupChildrenIntoLitters(children);
  }, [childrenRaw]);

  // Determine label for the other parent based on current pet's role
  // If current pet is "father", other parent is "Mother" and vice versa
  const anotherParentRole = parentRole === "father" ? "Mother" : "Father";

  // In drawer mode, hide the last litter (it might be incomplete due to limit)
  // Exception: if there's only 1 litter, show it anyway
  const visibleLitters = useMemo(() => {
    if (isFullscreen) return litters;
    if (litters.length <= 1) return litters;
    return litters.slice(0, -1); // Hide last potentially incomplete litter
  }, [litters, isFullscreen]);

  const hiddenLittersCount = litters.length - visibleLitters.length;

  // Count total children across all litters
  const totalChildren = useMemo(() => {
    return litters.reduce((sum, litter) => sum + litter.pets.length, 0);
  }, [litters]);

  // Infinite scroll refs and handlers
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { hasMore, isLoadingMore, loadMore } = infiniteResult;

  const handleLoadMore = useCallback(() => {
    if (isFullscreen && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [isFullscreen, hasMore, isLoadingMore, loadMore]);

  // Report count after data loads
  useEffect(() => {
    if (!isLoading && onLoadedCount) {
      onLoadedCount(totalChildren);
    }
  }, [isLoading, onLoadedCount, totalChildren]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!isFullscreen || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [isFullscreen, handleLoadMore, hasMore, isLoadingMore, totalChildren]);

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
      {visibleLitters.length > 0 ? (
        <div className={cn("grid gap-3", isFullscreen && "lg:grid-cols-2")}>
          {visibleLitters.map((litter, litterIndex) => (
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

      {/* Hidden litters hint (drawer mode only) */}
      {!isFullscreen && hiddenLittersCount > 0 && (
        <div className="py-3 flex justify-center">
          <span className="text-muted-foreground text-sm">
            more in fullscreen
          </span>
        </div>
      )}

      {/* Infinite scroll trigger & loading indicator */}
      {isFullscreen && (
        <div ref={loadMoreRef} className="py-4 flex justify-center">
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more...</span>
            </div>
          )}
          {!hasMore && totalChildren > 0 && (
            <span className="text-muted-foreground text-sm">
              All {totalChildren} children loaded
            </span>
          )}
        </div>
      )}
    </>
  );
}
