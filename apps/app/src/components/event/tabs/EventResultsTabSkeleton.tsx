import { cn } from "@ui/lib/utils";

interface EventResultsTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Native skeleton for EventResultsTab.
 *
 * Mirrors the real breed-grouped table: rounded-pill breed header,
 * then competitor rows on the same column tracks the real tab uses
 * (1fr_84px_24px in drawer; lg switches to 5-column in fullscreen).
 */
export function EventResultsTabSkeleton({
  isFullscreen = false,
}: EventResultsTabSkeletonProps) {
  const breedGroupCount = isFullscreen ? 3 : 2;
  const rowsPerGroup = isFullscreen ? 4 : 3;

  return (
    <div className="cursor-default" aria-busy="true" aria-live="polite">
      {Array.from({ length: breedGroupCount }).map((_, breedIndex) => (
        <div key={`breed-${breedIndex}`} className="mt-3">
          {/* Breed header pill */}
          <div className="bg-secondary-100 w-full rounded-full px-4 py-2.5">
            <span className="relative inline-block">
              <span className="invisible">Breed name</span>
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-32 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </span>
          </div>

          {/* Competitor rows */}
          {Array.from({ length: rowsPerGroup }).map((_, rowIndex) => (
            <div
              key={`row-${breedIndex}-${rowIndex}`}
              className={cn(
                "mt-4 grid w-full items-center gap-3 px-4 pb-2",
                isFullscreen
                  ? "grid-cols-[1fr_84px_24px] lg:grid-cols-[1fr_100px_60px_120px_100px_24px]"
                  : "grid-cols-[1fr_84px_24px] sm:grid-cols-[1fr_204px_24px] md:grid-cols-[1fr_124px_24px]",
              )}
            >
              {/* Pet name */}
              <div className="flex min-h-10 items-center">
                <div className="relative">
                  <span className="invisible">{"\u00A0"}</span>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-40 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </div>
              </div>

              {/* Class — fullscreen lg+ only */}
              {isFullscreen && (
                <span className="hidden lg:block relative">
                  <span className="invisible">{"\u00A0"}</span>
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-3 w-20 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </span>
              )}

              {/* Number — fullscreen lg+ only */}
              {isFullscreen && (
                <span className="hidden lg:block relative">
                  <span className="invisible">{"\u00A0"}</span>
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-3 w-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </span>
              )}

              {/* Result */}
              <div className="flex items-center">
                <div className="relative">
                  <span className="invisible">{"\u00A0"}</span>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-24 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </div>
              </div>

              {/* Judge — fullscreen lg+ only */}
              {isFullscreen && (
                <div className="hidden lg:flex items-center relative">
                  <span className="invisible">{"\u00A0"}</span>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-24 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </div>
              )}

              {/* External link icon */}
              <div className="size-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
