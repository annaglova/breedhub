import type { PageConfig } from "@/types/page-config.types";
import type { SpacePermissions } from "@/types/page-menu.types";

interface AchievementOutletProps {
  entity?: any;
  component: string;
  className?: string;

  // Menu configuration (from page config)
  pageConfig?: PageConfig | null;
  spacePermissions?: SpacePermissions;

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
  children,
}: AchievementOutletProps) {
  return (
    <div className={` ${className}`}>
      {/* Achievement content - entity-specific component via children */}
      {children}
    </div>
  );
}
