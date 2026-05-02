import { DataTable } from "@ui/components/data-table";
import { useMemo } from "react";

interface EditChildTableSkeletonProps {
  fields?: Record<string, any>;
}

/**
 * Column-aware skeleton for EditChildTableTab — lives outside the lazy
 * chunk so it can render as the Suspense fallback during chunk download.
 * Uses the same DataTable + fields-derived columns the real tab will
 * render, with `isLoading=true` so the table outline stays visible
 * across the chunk-load → data-load gap (no "empty body" flash before
 * the native skeleton mounts).
 */
export function EditChildTableSkeleton({ fields }: EditChildTableSkeletonProps) {
  const columns = useMemo(() => {
    if (!fields) return [];
    return Object.entries(fields)
      .filter(([, config]: [string, any]) => config?.showInTable)
      .sort(
        ([, a]: [string, any], [, b]: [string, any]) =>
          (a?.order ?? a?.sortOrder ?? 0) - (b?.order ?? b?.sortOrder ?? 0),
      )
      .map(([key, config]: [string, any]) => ({
        id: key,
        header: () => null,
        cell: () => null,
      }));
  }, [fields]);

  return (
    <div className="cursor-default">
      <DataTable
        columns={columns}
        data={[]}
        isLoading={true}
        skeletonRows={5}
        paginated={false}
      />
    </div>
  );
}
