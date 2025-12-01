/**
 * ListCardSkeleton - Skeleton placeholder for list card items
 *
 * Shows animated placeholder while entities are loading.
 * Matches the structure of typical list card: avatar + title + subtitle
 *
 * Based on Angular: libs/schema/feature/collection-view-scroller/list/entity-list-card.component.ts
 */
export function ListCardSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      {/* Avatar skeleton */}
      <div className="size-11 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />

      {/* Text content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Title */}
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4" />
        {/* Subtitle */}
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2" />
      </div>
    </div>
  );
}

/**
 * GridCardSkeleton - Skeleton placeholder for grid card items
 *
 * Shows animated placeholder for grid/card view.
 */
export function GridCardSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      {/* Image placeholder */}
      <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3" />

      {/* Title */}
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4 mb-2" />

      {/* Subtitle */}
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2" />
    </div>
  );
}
