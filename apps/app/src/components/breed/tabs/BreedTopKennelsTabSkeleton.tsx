import { cn } from "@ui/lib/utils";

interface BreedTopKennelsTabSkeletonProps {
  isFullscreen?: boolean;
}

/**
 * Native skeleton for BreedTopKennelsTab.
 *
 * Mirrors the AvatarCard grid (kennel mode, no place badge). Same
 * size-40 round avatar + name row that the real tab renders.
 */
export function BreedTopKennelsTabSkeleton({
  isFullscreen = false,
}: BreedTopKennelsTabSkeletonProps) {
  const cardCount = isFullscreen ? 10 : 6;

  return (
    <div
      className={cn(
        "mt-3 grid grid-cols-2 gap-y-6 sm:grid-cols-3",
        isFullscreen && "lg:grid-cols-4 xxl:grid-cols-5",
      )}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: cardCount }).map((_, index) => (
        <div
          key={`kennel-${index}`}
          className="flex flex-col items-center justify-center"
        >
          {/* Avatar circle — matches real size-40 with border */}
          <div className="size-40 rounded-full border border-surface-border bg-slate-200 dark:bg-slate-700 animate-pulse" />
          {/* Name line */}
          <div className="mt-2 text-center">
            <div className="relative">
              <span className="invisible">{"\u00A0"}</span>
              <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-3.5 w-32 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
