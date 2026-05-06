import { dictionaryStore } from "@breedhub/rxdb-store";
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
