import { useMemo } from 'react';
import { spaceStore } from '@breedhub/rxdb-store';
import type { DataSourceConfig } from '@breedhub/rxdb-store';

/**
 * Applies config.limit at presentation layer when NOT in tab fullscreen.
 *
 * RxDB cache may hold more records than config.limit (loaded by previous
 * infinite scroll session). This hook slices the data for consistent UX
 * across drawer / page fullscreen / tab fullscreen modes.
 *
 * - Drawer: config limit applies
 * - Page fullscreen: config limit applies
 * - Tab fullscreen: no limit (infinite scroll)
 */
export function useDisplayLimit<T>(
  data: T[] | undefined | null,
  dataSource?: DataSourceConfig[]
): T[] | undefined | null {
  const isTabFullscreen = spaceStore.isTabFullscreen.value;

  return useMemo(() => {
    if (isTabFullscreen || !data) return data;
    const configLimit = dataSource?.[0]?.childTable?.limit;
    if (configLimit && data.length > configLimit) {
      return data.slice(0, configLimit);
    }
    return data;
  }, [data, isTabFullscreen, dataSource]);
}
