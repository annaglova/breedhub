import { cn } from "@ui/lib/utils";

interface PetChildrenTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Column-aware skeleton for PetChildrenTab.
 *
 * Mirrors LitterCard / PetLinkRow DOM shape exactly so heights are driven
 * by the same font-size + line-height stack — no jump between skeleton and
 * real on the header (DOB / parent name + role labels) or on the child
 * rows. Two litter cards, two child rows each, regardless of mode.
 */
export function PetChildrenTabSkeleton({
  isFullscreen = false,
}: PetChildrenTabSkeletonProps) {
  const gridCols = isFullscreen
    ? "grid-cols-[110px_auto] lg:grid-cols-[115px_auto] xl:grid-cols-[130px_auto]"
    : "grid-cols-[52px_auto] sm:grid-cols-[100px_auto] md:grid-cols-[110px_auto]";

  return (
    <div
      className={cn("grid gap-3", isFullscreen && "lg:grid-cols-2")}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: 2 }).map((_, litterIndex) => (
        <div
          key={`litter-${litterIndex}`}
          className="card card-rounded flex flex-auto flex-col p-6 lg:px-8"
        >
          {/* Litter header — same DOM shape as real LitterCard header
              (font-size + line-height drive height; bars are absolute
              inside text-sized wrappers, so swapping skeleton ↔ real
              never shifts the row). */}
          <div
            className={cn(
              "grid gap-3 border-b border-border px-6 py-3 font-semibold md:px-8",
              gridCols,
            )}
          >
            {/* DOB */}
            <div className="flex flex-col">
              <div className="relative">
                <span className="invisible">{"\u00A0"}</span>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-20 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
              <div className="text-secondary hidden text-sm font-light sm:block relative">
                <span className="invisible">{"\u00A0"}</span>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2.5 w-6 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
            </div>

            {/* Other parent */}
            <div className="flex flex-col min-w-0">
              <div className="relative truncate">
                <span className="invisible">{"\u00A0"}</span>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-40 max-w-full rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
              <div className="text-secondary text-sm font-light relative">
                <span className="invisible">{"\u00A0"}</span>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Two children rows — same DOM shape as real PetLinkRow */}
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
      ))}
    </div>
  );
}
