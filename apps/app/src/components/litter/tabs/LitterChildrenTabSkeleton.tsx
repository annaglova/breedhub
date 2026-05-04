import { cn } from "@ui/lib/utils";

interface LitterChildrenTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Native skeleton for LitterChildrenTab.
 *
 * Mirrors the PetCard (litter mode) grid: sex bar, avatar, name,
 * country/year, then a Breed/Status sub-grid. Same grid columns the
 * real tab will render.
 */
export function LitterChildrenTabSkeleton({
  isFullscreen = false,
}: LitterChildrenTabSkeletonProps) {
  const cardCount = isFullscreen ? 6 : 4;

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
            key={`child-${index}`}
            className="card card-rounded flex flex-col items-center justify-center px-6 py-3 sm:px-8"
          >
            {/* Sex bar */}
            <div className="mb-4 w-36 sm:w-44 h-1.5 rounded-sm bg-slate-200 dark:bg-slate-700 animate-pulse" />
            {/* Avatar */}
            <div className="size-36 sm:size-44 rounded-xl border border-surface-border bg-slate-200 dark:bg-slate-700 animate-pulse" />
            {/* Name */}
            <div className="my-3 flex min-h-12 w-48 md:w-52 items-center justify-center">
              <div className="relative">
                <span className="invisible">{"\u00A0"}</span>
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-3.5 w-32 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
            </div>
            {/* Divider + meta */}
            <div className="flex w-full flex-col border-t border-surface-border">
              <em className="mb-2 mt-3 text-center text-sm relative block">
                <span className="invisible">{"\u00A0"}</span>
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-3 w-20 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </em>
              <div className="h-30 flex items-start overflow-hidden text-base mt-1">
                <div
                  className="grid w-full gap-y-3"
                  style={{ gridTemplateColumns: "44px auto" }}
                >
                  <span className="text-secondary">Breed</span>
                  <div className="relative">
                    <span className="invisible">{"\u00A0"}</span>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-32 max-w-full rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  </div>
                  <span className="text-secondary">Status</span>
                  <div className="relative">
                    <span className="invisible">{"\u00A0"}</span>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-24 max-w-full rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
