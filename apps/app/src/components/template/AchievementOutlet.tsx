import type { PageConfig } from "@/types/page-config.types";
import type { SpacePermissions } from "@/types/page-menu.types";

interface AchievementOutletProps {
  entity?: any;
  component: string;
  className?: string;

  // Menu configuration (from page config)
  pageConfig?: PageConfig | null;
  spacePermissions?: SpacePermissions;

  // Loading state - shows skeleton when true, but still renders children (invisible)
  isLoading?: boolean;

  // Component to render inside the outlet
  children?: React.ReactNode;
}

/**
 * AchievementOutlet - Universal achievement outlet
 *
 * Simple wrapper for achievement components (breed achievements, kennel achievements, etc.)
 * Provides consistent spacing and styling
 *
 * IMPORTANT: Always renders children (even when loading) so they can trigger data loading.
 * Uses skeleton overlay when loading, children are invisible but mounted.
 *
 * Wraps entity-specific achievement components (BreedAchievements, KennelAchievements, etc.)
 */
export function AchievementOutlet({
  entity,
  component,
  className = "",
  pageConfig,
  spacePermissions,
  isLoading = false,
  children,
}: AchievementOutletProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Skeleton overlay - shown when loading */}
      {isLoading && (
        <div className="flex flex-wrap gap-2">
          {/* Chip skeleton placeholders */}
          <div className="h-7 w-32 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="h-7 w-40 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="h-7 w-28 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
        </div>
      )}

      {/* Children always rendered to trigger data loading */}
      {/* Invisible when loading, visible when ready */}
      <div className={isLoading ? "invisible absolute inset-0" : ""}>
        {children}
      </div>
    </div>
  );
}
