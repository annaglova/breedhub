import type { PageConfig } from "@/types/page-config.types";
import type { SpacePermissions } from "@/types/page-menu.types";

interface AchievementOutletProps {
  entity?: any;
  component: string;
  className?: string;

  // Menu configuration (from page config)
  pageConfig?: PageConfig | null;
  spacePermissions?: SpacePermissions;

  // Loading state - shows skeleton when true
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
  // Show skeleton when loading - 3 chip placeholders
  if (isLoading) {
    return (
      <div className={`flex flex-wrap gap-2  ${className}`}>
        {/* Chip skeleton placeholders */}
        <div className="h-7 w-32 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="h-7 w-40 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="h-7 w-28 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>
    );
  }

  return (
    <div className={` ${className}`}>
      {/* Achievement content - entity-specific component via children */}
      {children}
    </div>
  );
}
