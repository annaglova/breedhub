/**
 * PublicPageSkeleton - Skeleton placeholder for PublicPageTemplate
 *
 * Shows animated placeholder while entity is loading.
 * Matches the structure: Cover + Avatar + Name + Tabs
 *
 * Based on Angular outlets skeleton states
 */
export function PublicPageSkeleton() {
  return (
    <div className="size-full flex flex-col content-padding animate-pulse">
      <div className="flex flex-auto flex-col items-center overflow-auto">
        <div className="w-full max-w-3xl lg:max-w-4xl xxl:max-w-5xl">
          {/* Cover skeleton */}
          <div className="relative w-full h-64 md:h-80 rounded-lg bg-gray-200 dark:bg-gray-700 mb-6 overflow-hidden">
            {/* Top gradient overlay simulation */}
            <div className="absolute top-0 z-10 h-20 w-full bg-gradient-to-b from-gray-300/40 to-transparent dark:from-gray-600/40" />
          </div>

          {/* Avatar + Actions row skeleton */}
          <div className="-mt-20 flex items-end relative pb-3 z-20">
            {/* Avatar */}
            <div className="size-44 rounded-full bg-gray-300 dark:bg-gray-600 ring-4 ring-white dark:ring-gray-900 shrink-0" />

            {/* Actions */}
            <div className="mb-1 ml-auto flex gap-2">
              <div className="w-20 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>

          {/* Name section skeleton */}
          <div className="relative bg-card-ground">
            <div className="flex flex-col space-y-5 pb-10 pt-1">
              {/* Additional info */}
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-full" />

              {/* Name */}
              <div className="space-y-2">
                <div className="h-7 w-80 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="flex items-center space-x-2">
                  <div className="size-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs skeleton */}
          <div className="mt-4">
            {/* Tab headers */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Tab content */}
            <div className="mt-6 space-y-4">
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="h-32 w-full bg-gray-200 dark:bg-gray-700 rounded-lg mt-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
