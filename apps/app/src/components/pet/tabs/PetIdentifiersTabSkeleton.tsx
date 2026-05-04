import { cn } from "@ui/lib/utils";

interface PetIdentifiersTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Column-aware skeleton for PetIdentifiersTab.
 *
 * Mirrors PetIdentifiersTab's two-column grid (`Identifier` / `Value`) so
 * the table outline stays visible during cold-load. Generic
 * `TabBodySkeleton` returns null in fullscreen mode — a tab on a direct
 * `/pet-slug/ident` URL would otherwise sit blank between header skeleton
 * and data arrival. Lives in its own module so it can also serve as a
 * Suspense fallback if the lazy tab chunk is split out.
 */
export function PetIdentifiersTabSkeleton({
  isFullscreen = false,
}: PetIdentifiersTabSkeletonProps) {
  const gridCols = isFullscreen
    ? "grid-cols-[184px_auto] lg:grid-cols-[284px_auto]"
    : "grid-cols-[120px_auto] sm:grid-cols-[184px_auto]";
  const skeletonRowCount = isFullscreen ? 8 : 5;

  return (
    <div className="card card-rounded flex flex-auto flex-col p-6 lg:px-8 cursor-default">
      <div className="grid" aria-busy="true" aria-live="polite">
        <div
          className={cn(
            "grid gap-3 border-b border-border px-6 py-3 font-bold text-secondary lg:px-8",
            gridCols,
          )}
        >
          <div>Identifier</div>
          <div>Value</div>
        </div>
        {Array.from({ length: skeletonRowCount }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className={cn(
              "grid items-center gap-3 px-6 py-2 lg:px-8",
              gridCols,
              index % 2 === 0 ? "bg-card-ground" : "bg-even-card-ground",
            )}
          >
            <div className="h-[21px] flex items-center">
              <div className="h-3.5 w-24 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
            <div className="h-[21px] flex items-center">
              <div className="h-3.5 w-40 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
