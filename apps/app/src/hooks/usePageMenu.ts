import { useMemo } from 'react';
import type { PageConfig } from '@/types/page-config.types';
import type { MenuContext, PageMenuItem, SpacePermissions } from '@/types/page-menu.types';

interface UsePageMenuOptions {
  pageConfig: PageConfig | null;
  context: MenuContext;
  spacePermissions: SpacePermissions;
  containerWidth?: number;  // Current container width for minWidth check
}

interface PageMenuItemWithId extends PageMenuItem {
  id: string;
}

/**
 * Hook to filter and sort page menu items by context and permissions
 *
 * Filters menu items based on:
 * 1. Context (avatar, sticky, tabs, page)
 * 2. Permissions (space-level + user-level)
 * 3. Container width (minWidth)
 * 4. Exclude contexts
 *
 * @example
 * const menuItems = usePageMenu({
 *   pageConfig,
 *   context: 'avatar',
 *   spacePermissions: { canEdit: true, canDelete: false },
 *   containerWidth: 1280
 * });
 */
export function usePageMenu({
  pageConfig,
  context,
  spacePermissions,
  containerWidth = 0
}: UsePageMenuOptions): PageMenuItemWithId[] {
  return useMemo(() => {
    if (!pageConfig?.menus) {
      return [];
    }

    // Get first menu config (we have one menu per page for now)
    const menuConfigKey = Object.keys(pageConfig.menus)[0];
    const menuConfig = pageConfig.menus[menuConfigKey];

    if (!menuConfig?.items) {
      return [];
    }

    // Convert items object to array with IDs
    const items = Object.entries(menuConfig.items)
      .map(([id, item]) => ({
        id,
        ...item
      }))
      .filter(item => {
        // 1. Check if item should appear in this context
        if (!item.visibility.contexts.includes(context)) {
          return false;
        }

        // 2. Check if item is excluded from this context
        if (item.visibility.excludeContexts?.includes(context)) {
          return false;
        }

        // 3. Check minWidth if specified
        if (item.visibility.minWidth && containerWidth > 0) {
          if (containerWidth < item.visibility.minWidth) {
            return false;
          }
        }

        // 4. Check permissions
        if (item.visibility.requiresPermission) {
          const permission = item.visibility.requiresPermission;

          // Map permission string to space permission
          if (permission === 'edit' && !spacePermissions.canEdit) {
            return false;
          }
          if (permission === 'delete' && !spacePermissions.canDelete) {
            return false;
          }
          if (permission === 'add' && !spacePermissions.canAdd) {
            return false;
          }

          // TODO: Add user-level permissions check after login implementation
          // if (!userPermissions.canEdit) return false;
        }

        return true;
      })
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    return items;
  }, [pageConfig, context, spacePermissions, containerWidth]);
}

/**
 * Get items that should be shown as separate buttons (duplicateOnDesktop)
 */
export function usePageMenuButtons({
  pageConfig,
  context,
  spacePermissions,
  containerWidth = 0,
  minDesktopWidth = 1024
}: UsePageMenuOptions & { minDesktopWidth?: number }): PageMenuItemWithId[] {
  const allItems = usePageMenu({ pageConfig, context, spacePermissions, containerWidth });

  return useMemo(() => {
    if (containerWidth < minDesktopWidth) {
      return [];
    }

    return allItems.filter(item => item.visibility.duplicateOnDesktop === true);
  }, [allItems, containerWidth, minDesktopWidth]);
}
