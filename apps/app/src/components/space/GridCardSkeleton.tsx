/**
 * GridCardSkeleton - Skeleton placeholder for grid card items
 *
 * Mirrors the live PetTabCard / EntityTabCardWrapper geometry exactly:
 * - Outer wrapper: `flex flex-col h-[itemHeight] p-3 rounded-md`
 *   (same as `EntityTabCardWrapper` so the skeleton card occupies the
 *   same grid slot as the real one).
 * - Image area: `h-[206px] rounded-xl border border-surface-border` —
 *   identical to `PetTabCard`'s image container, so the photo placeholder
 *   matches the real photo footprint to the pixel.
 * - Content area: `w-full p-2` with a two-row pulse stack matching the
 *   real name + status/date rows.
 */
interface GridCardSkeletonProps {
  itemHeight?: number;
}

export function GridCardSkeleton({ itemHeight = 280 }: GridCardSkeletonProps) {
  return (
    <div
      className="flex flex-col p-3 rounded-md animate-pulse"
      style={{ height: itemHeight }}
    >
      {/* Image area — same h-[206px] + rounded-xl + border as real card */}
      <div className="relative h-[206px] rounded-xl border border-surface-border bg-slate-200 dark:bg-slate-700" />

      {/* Content area — same w-full p-2 wrapper as real card */}
      <div className="w-full p-2 space-y-2">
        {/* Name row */}
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
        {/* Status + date row */}
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2" />
      </div>
    </div>
  );
}
