import { cn } from "@ui/lib/utils";

interface PetSiblingsTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Column-aware skeleton for PetSiblingsTab.
 *
 * Mirrors the real sibling-group card / PetLinkRow DOM shape so heights
 * are driven by the same font-size + line-height stack — no jump on the
 * header (DOB) or on the sibling rows. One sibling-group card with two
 * rows, regardless of mode.
 */
export function PetSiblingsTabSkeleton({
  isFullscreen = false,
}: PetSiblingsTabSkeletonProps) {
  const gridCols = isFullscreen
    ? "grid-cols-[110px_auto] lg:grid-cols-[115px_auto] xl:grid-cols-[130px_auto]"
    : "grid-cols-[52px_auto] sm:grid-cols-[100px_auto] md:grid-cols-[110px_auto]";

  return (
    <div
      className={cn(
        "grid flex-col-reverse gap-3",
        isFullscreen && "lg:grid-cols-2",
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="card card-rounded flex flex-auto flex-col p-6 md:px-10">
        {/* Group header — DOB only (font-size + line-height drive
            height; bar is absolute inside a text-sized wrapper, so
            swapping skeleton ↔ real never shifts the row). */}
        <div className="grid gap-3 border-b border-border px-6 py-3 font-semibold lg:px-8">
          <div className="relative">
            <span className="invisible">{"\u00A0"}</span>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-20 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
        </div>

        {/* Two sibling rows — same DOM shape as real PetLinkRow */}
        {Array.from({ length: 2 }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className={cn(
              "grid items-center gap-3 px-6 py-2 lg:px-8 min-w-0",
              gridCols,
            )}
          >
            {/* Sex column — sex mark + (sm+) sex name */}
            <div className="flex flex-row items-center space-x-2.5">
              <div className="size-4 rounded-full sm:h-4 sm:w-1 sm:rounded-sm bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <span className="hidden sm:block relative">
                <span className="invisible">{"\u00A0"}</span>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3 w-12 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </span>
            </div>

            {/* Pet name */}
            <div className="truncate relative">
              <span className="invisible">{"\u00A0"}</span>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-44 max-w-full rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
