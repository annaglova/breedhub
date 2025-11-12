import { useEffect, useState } from 'react';
import { appStore } from '@breedhub/rxdb-store';

interface MenuItem {
  id: string;
  type: 'item' | 'separator';
  icon?: string;
  label?: string;
  path?: string;
  badge?: string;
  badgeVariant?: 'primary' | 'accent';
  badgeType?: 'primary' | 'accent'; // Support both naming conventions
  order?: number;
}

/**
 * Hook to get user menu from user_config
 * Returns flattened menu items from all sections
 */
export function useUserMenu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        setLoading(true);

        // Wait for appStore to initialize
        if (!appStore.initialized.value) {
          await new Promise<void>((resolve) => {
            const unsubscribe = appStore.initialized.subscribe((value: boolean) => {
              if (value) {
                unsubscribe();
                resolve();
              }
            });
          });
        }

        const config = appStore.appConfig.value;

        // Navigate through the nested structure
        if (!config?.data?.user_config) {
          console.warn('[useUserMenu] No user_config found in config.data');
          setMenuItems([]);
          return;
        }

        // user_config is an object with config_user_config_* keys
        const userConfigKeys = Object.keys(config.data.user_config);

        if (userConfigKeys.length === 0) {
          console.warn('[useUserMenu] user_config is empty');
          setMenuItems([]);
          return;
        }

        // Get first user_config (e.g., config_user_config_1758713120487)
        const userConfigKey = userConfigKeys[0];
        const userConfigData = config.data.user_config[userConfigKey];

        if (!userConfigData?.menus) {
          console.warn('[useUserMenu] No menus found in user_config');
          setMenuItems([]);
          return;
        }

        // Get the main user menu config
        const userMenus = userConfigData.menus;
        const userMenuKey = Object.keys(userMenus)[0]; // Get first menu
        const userMenu = userMenus[userMenuKey];

        if (!userMenu?.sections) {
          console.warn('[useUserMenu] No menu sections found');
          setMenuItems([]);
          return;
        }

        // Flatten all sections and their items into a single array
        const items: MenuItem[] = [];

        // Sort sections by order
        const sortedSections = Object.entries(userMenu.sections)
          .map(([key, section]: [string, any]) => ({
            key,
            ...section
          }))
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

        for (let i = 0; i < sortedSections.length; i++) {
          const section = sortedSections[i];

          // Add separator after previous section if it has hasDivider
          if (i > 0 && sortedSections[i - 1].hasDivider) {
            items.push({
              id: `sep-${section.key}`,
              type: 'separator'
            });
          }

          // Add section items
          if (section.items) {
            const sortedItems = Object.entries(section.items)
              .map(([key, item]: [string, any]) => ({
                id: key,
                type: 'item' as const,
                ...item
              }))
              .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

            items.push(...sortedItems);
          }
        }

        setMenuItems(items);
      } catch (error) {
        console.error('[useUserMenu] Error loading menu:', error);
        setMenuItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadMenu();

    // Subscribe to config changes
    const unsubscribe = appStore.appConfig.subscribe(() => {
      loadMenu();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    menuItems,
    loading
  };
}
