/**
 * Partition-field resolver: maps `entity` (e.g. `'pet'`) → partition column
 * name (e.g. `'breed_id'`).
 *
 * Two layers:
 *   - β  PARTITION_FIELDS: TS constant, sync source of truth.
 *   - α  partitionFieldMap: in-memory map populated incrementally by
 *        route-store as routes resolve/save. Acts as a config-driven
 *        validator — drift between routes.partition_field and the constant
 *        triggers a dev-only warning.
 *
 * Resolver reads map first, falls back to constant. Sync, no DB calls.
 */

export const PARTITION_FIELDS: Readonly<Record<string, string>> = Object.freeze({
  pet: 'breed_id',
});

const partitionFieldMap = new Map<string, string>();
const driftWarned = new Set<string>();

const isDev = (() => {
  try {
    return Boolean((import.meta as any)?.env?.DEV);
  } catch {
    return false;
  }
})();

/**
 * Returns the partition column name for `entity`, or `null` if the entity is
 * not partitioned.
 */
export function getPartitionFieldForEntity(entity: string | null | undefined): string | null {
  if (!entity) return null;
  const fromMap = partitionFieldMap.get(entity);
  if (fromMap) return fromMap;
  return PARTITION_FIELDS[entity] ?? null;
}

/**
 * Record a `(entity, partition_field)` pair observed from a routes row.
 * Empty/null `field` means "not partitioned" — recorded as absent.
 *
 * Dev-only: warns once per entity if the value disagrees with PARTITION_FIELDS.
 */
export function recordPartitionFieldFromRoute(entity: string | null | undefined, field: string | null | undefined): void {
  if (!entity) return;
  const trimmed = typeof field === 'string' ? field.trim() : '';
  if (!trimmed) return;

  partitionFieldMap.set(entity, trimmed);

  if (isDev) {
    const expected = PARTITION_FIELDS[entity];
    if (expected && expected !== trimmed && !driftWarned.has(entity)) {
      driftWarned.add(entity);
      console.warn(
        `[partition-fields] Drift detected for entity '${entity}': routes.partition_field='${trimmed}' but PARTITION_FIELDS constant='${expected}'. Update the constant or fix the routes row.`,
      );
    }
  }
}

/** Test-only reset hook. Not exported from package barrel. */
export function _resetPartitionFieldMapForTests(): void {
  partitionFieldMap.clear();
  driftWarned.clear();
}
