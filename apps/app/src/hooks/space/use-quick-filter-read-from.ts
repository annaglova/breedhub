import {
  userStore,
  type SpaceQuickFiltersConfig,
} from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";
import { useMemo } from "react";
import type { ResolvedReadFromConfig } from "./use-entities.read-from";

/**
 * Resolve a quick-filter scope into a `ResolvedReadFromConfig` for `useEntities`.
 *
 * Returns `undefined` when:
 *   - the space has no `quickFilters` config (caller should pass undefined readFrom);
 *   - the active scope isn't in `modes` and there's no `default` to fall back to;
 *   - the runtime parent id (currently `userStore.currentContactId`) isn't loaded yet.
 *
 * The undefined return tells `useEntities` to stay in its loading skeleton —
 * crucial so we never fall back to a global pet scan while contact_id is still
 * being resolved on cold load.
 */
export function useQuickFilterReadFrom(
  quickFilters: SpaceQuickFiltersConfig | undefined,
  activeScope: string | null | undefined,
): ResolvedReadFromConfig | undefined {
  useSignals();
  // Read the signal value at the top of render so @preact/signals-react
  // registers a subscription. Reading it only inside useMemo deps does NOT
  // create a subscription — the hook then never re-renders when the lookup
  // resolves, and readFrom stays undefined forever.
  const currentContactId = userStore.currentContactId.value;

  const parentId = useMemo(() => {
    if (!quickFilters) return undefined;
    if (quickFilters.parentIdSource === "currentContactId") {
      return currentContactId ?? undefined;
    }
    return undefined;
  }, [quickFilters, currentContactId]);

  return useMemo(() => {
    if (!quickFilters) return undefined;
    const modeList = Object.values(quickFilters.modes);
    const mode =
      (activeScope && modeList.find((m) => m.slug === activeScope)) ||
      modeList.find((m) => m.isDefault) ||
      modeList[0];
    if (!mode || !parentId) return undefined;
    return {
      table: mode.table,
      parentField: mode.parentField,
      entityIdField: mode.entityIdField,
      entityPartitionField: mode.entityPartitionField,
      parentId,
    };
  }, [quickFilters, activeScope, parentId]);
}
