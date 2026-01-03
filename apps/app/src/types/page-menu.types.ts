import type { IconConfig } from '@breedhub/rxdb-store';

/**
 * Page menu item visibility configuration
 */
export interface PageMenuItemVisibility {
  /** Contexts where this item should appear */
  contexts: string[];  // ['avatar', 'sticky', 'tabs']

  /** Minimum container width to show this item */
  minWidth?: number;

  /** Contexts where this item should NOT appear */
  excludeContexts?: string[];

  /** Show both as button and in menu on desktop */
  duplicateOnDesktop?: boolean;

  /** Required permission to show this item ('edit', 'delete', null) */
  requiresPermission?: string | null;
}

/**
 * Page menu item configuration
 */
export interface PageMenuItem {
  /** Icon configuration */
  icon: IconConfig;

  /** Display label */
  label: string;

  /** Action identifier */
  action: string;  // 'edit' | 'copy_link' | 'copy_name' | 'make_note' | 'bug_report' | 'navigate_to_tab' | etc.

  /** Optional parameters for action (e.g., { tab: 'pets', fullscreen: true } for navigate_to_tab) */
  actionParams?: Record<string, any>;

  /** Visibility rules */
  visibility: PageMenuItemVisibility;

  /** Show divider before this item */
  hasDivider?: boolean;

  /** Display order */
  order: number;
}

/**
 * Page menu configuration
 */
export interface PageMenuConfig {
  items: Record<string, PageMenuItem>;
}

/**
 * Context type for menu filtering
 */
export type MenuContext = 'avatar' | 'sticky' | 'tabs' | 'page';

/**
 * Space-level permissions
 */
export interface SpacePermissions {
  canEdit: boolean;
  canDelete: boolean;
  canAdd: boolean;
}
