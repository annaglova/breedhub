import { dictionaryStore, getPartitionFieldForEntity } from "@breedhub/rxdb-store";
import type { PartitionFilter } from "@breedhub/rxdb-store";

/**
 * Resolve a single record from a dictionary table by id.
 *
 * For partitioned tables (`pet`, partitioned by `breed_id`) the caller MUST
 * pass `partitionFilter` so Postgres can prune partitions; otherwise the
 * query locks all 450 partitions and triggers `max_locks_per_transaction`
 * exhaustion. For non-partitioned tables omit it.
 */
export async function loadLookupById(
  table: string,
  id: string | null | undefined,
  partitionFilter?: PartitionFilter | null,
): Promise<Record<string, unknown> | null> {
  if (!id) return null;
  return dictionaryStore.getRecordById(
    table,
    id,
    partitionFilter ? { partitionFilter } : undefined,
  );
}

/**
 * Look up a `pet` row by id with the breed_id partition filter applied.
 *
 * Refuses to fire the query (returns null) and warns if `petId` is set but
 * `breedId` is missing or non-string — that's a data-integrity signal we
 * want surfaced rather than swallowed by a 503 from a full-partition scan.
 *
 * `context` is just a label for the warning prefix (e.g. caller component name).
 */
export async function loadPetByBreed(
  petId: string | null | undefined,
  breedId: unknown,
  context: string,
): Promise<Record<string, unknown> | null> {
  if (!petId) return null;
  if (typeof breedId !== "string" || !breedId) {
    console.warn(
      `[${context}] pet ${petId} is missing breed_id; skipping lookup to avoid full-partition scan`,
    );
    return null;
  }
  const field = getPartitionFieldForEntity("pet");
  if (!field) {
    console.warn(`[${context}] no partition field configured for pet; skipping lookup`);
    return null;
  }
  return loadLookupById("pet", petId, { field, value: breedId });
}
