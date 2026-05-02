import { cn } from "@ui/lib/utils";

interface PetShowResultsTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Column-aware skeleton for PetShowResultsTab.
 *
 * Lives outside the lazy PetShowResultsTab chunk so it can render as the
 * Suspense fallback during chunk download — keeps the table outline visible
 * across the chunk-load → data-load gap. Cold-load shows a single skeleton
 * state continuously instead of "header skel → empty body → real data".
 *
 * Mirrors PetHealthTabSkeleton's pattern: same grid template the real table
 * will use, with pill-shaped placeholders for each cell.
 */
export function PetShowResultsTabSkeleton({ isFullscreen = false }: PetShowResultsTabSkeletonProps) {
  const gridCols = isFullscreen
    ? "grid-cols-[132px_auto_44px] lg:grid-cols-[132px_226px_auto_176px_44px]"
    : "grid-cols-[132px_auto_44px]";
  const skeletonRowCount = isFullscreen ? 12 : 5;

  return (
    <div className="card card-rounded flex flex-auto flex-col p-6 lg:px-8 cursor-default">
      <div className="grid" aria-busy="true" aria-live="polite">
        <div
          className={cn(
            "grid gap-3 border-b border-border px-6 py-3 font-bold text-secondary md:px-8",
            gridCols,
          )}
        >
          <span>Date</span>
          <span className={cn("hidden", isFullscreen && "lg:block")}>Show</span>
          <span>Result</span>
          <span className={cn("hidden", isFullscreen && "lg:block")}>Judge</span>
          <span>Details</span>
        </div>
        {Array.from({ length: skeletonRowCount }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className={cn(
              "grid items-center gap-3 rounded-md px-6 py-2 md:px-8",
              gridCols,
              index % 2 === 0 ? "bg-card-ground" : "bg-even-card-ground",
            )}
          >
            <div className="h-[21px] flex items-center">
              <div className="h-3.5 w-20 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
            <div className={cn("h-[21px] hidden items-center", isFullscreen && "lg:flex")}>
              <div className="h-3.5 w-28 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
            <div className="h-[21px] flex items-center">
              <div className="h-3.5 w-40 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
            <div className={cn("h-[21px] hidden items-center", isFullscreen && "lg:flex")}>
              <div className="h-3.5 w-32 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
            <div className="h-[21px] flex items-center justify-center">
              <div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
