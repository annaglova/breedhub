import { cn } from "@ui/lib/utils";

interface KennelServicesTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Native skeleton for KennelServicesTab.
 *
 * Mirrors SalePetCard layout: breed link, big avatar, name+sex,
 * country/year, optional features, and Father/Mother sub-cards.
 * Same grid the real tab renders so cold-load → data-load is
 * structurally consistent.
 */
export function KennelServicesTabSkeleton({
  isFullscreen = false,
}: KennelServicesTabSkeletonProps) {
  const cardCount = isFullscreen ? 8 : 4;

  return (
    <div className="mt-3" aria-busy="true" aria-live="polite">
      <div
        className={cn(
          "grid gap-3 sm:grid-cols-2",
          isFullscreen && "lg:grid-cols-3 xxl:grid-cols-4",
        )}
      >
        {Array.from({ length: cardCount }).map((_, index) => (
          <div
            key={`sale-${index}`}
            className="card card-rounded flex w-full flex-col items-center p-6 md:px-8"
          >
            {/* Breed link */}
            <div className="text-sm mb-2 flex w-full">
              <div className="relative">
                <span className="invisible">{"\u00A0"}</span>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3 w-24 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
            </div>

            {/* Pet avatar */}
            <div className="size-45 lg:size-56 rounded-xl border border-surface-border bg-slate-200 dark:bg-slate-700 animate-pulse" />

            {/* Pet name + sex */}
            <div className="mb-2 mt-3 flex min-h-12 w-full items-center justify-center space-x-3">
              <div className="size-4 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="relative">
                <span className="invisible">{"\u00A0"}</span>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-32 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
            </div>

            {/* Country + DOB */}
            <div className="text-secondary mb-3 mt-1 flex w-full justify-center border-t border-surface-border pt-3">
              <em className="text-center text-sm relative block">
                <span className="invisible">{"\u00A0"}</span>
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-3 w-16 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </em>
            </div>

            {/* Parents */}
            <div className="flex flex-row gap-3">
              {Array.from({ length: 2 }).map((_, parentIndex) => (
                <div key={`parent-${parentIndex}`} className="flex flex-col items-center">
                  <div className="w-28 lg:w-28">
                    <div className="h-28 lg:h-28 rounded-xl border border-surface-border bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <em className="text-secondary text-sm">
                      {parentIndex === 0 ? "Father" : "Mother"}
                    </em>
                  </div>
                  <div className="w-34 sm:w-38 lg:w-40 flex min-h-14 items-center text-center text-base">
                    <div className="relative w-full">
                      <span className="invisible">{"\u00A0"}</span>
                      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-3 w-24 max-w-full rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
