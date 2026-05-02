import { cn } from "@ui/lib/utils";

interface PetHealthTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Column-aware skeleton for PetHealthTab.
 *
 * Lives in its own module (not inside the lazy PetHealthTab chunk) so it can
 * be used as a Suspense fallback during chunk download — keeps the table
 * outline visible across the chunk-load → data-load gap so cold-load shows
 * a single skeleton state instead of "header skeleton → empty body → table
 * skeleton → data".
 */
export function PetHealthTabSkeleton({ isFullscreen = false }: PetHealthTabSkeletonProps) {
  const gridCols = isFullscreen
    ? "grid-cols-[132px_184px_auto] lg:grid-cols-[132px_284px_auto]"
    : "grid-cols-[132px_auto] sm:grid-cols-[184px_auto] md:grid-cols-[86px_184px_auto]";
  const dateCellVisibility = isFullscreen ? "block" : "hidden md:block";
  const skeletonRowCount = isFullscreen ? 12 : 5;

  return (
    <div className="card card-rounded flex flex-auto flex-col p-6 lg:px-8 cursor-default">
      <div className="grid" aria-busy="true" aria-live="polite">
        <div
          className={cn(
            "grid gap-3 border-b border-border px-6 py-3 font-bold text-secondary lg:px-8",
            gridCols,
          )}
        >
          <div className={dateCellVisibility}>Date</div>
          <div>Object</div>
          <div>Result</div>
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
            <div className={cn("h-[21px] flex items-center", dateCellVisibility)}>
              <div className="h-3.5 w-20 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
            <div className="h-[21px] flex items-center">
              <div className="h-3.5 w-28 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
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
