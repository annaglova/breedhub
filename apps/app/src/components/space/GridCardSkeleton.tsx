/**
 * GridCardSkeleton - Skeleton placeholder for grid card items
 *
 * Shows animated placeholder for grid/card view.
 */
interface GridCardSkeletonProps {
  itemHeight?: number;
}

export function GridCardSkeleton({ itemHeight = 280 }: GridCardSkeletonProps) {
  return (
    <div className="p-4 animate-pulse" style={{ height: itemHeight }}>
      {/* Image placeholder */}
      <div className="w-full h-[14.25rem] bg-slate-200 dark:bg-slate-700 rounded-lg mb-3" />

      {/* Title */}
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4 mb-2" />

      {/* Subtitle */}
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2" />
    </div>
  );
}
