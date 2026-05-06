/**
 * Partition filter descriptor for queries against partitioned tables.
 *
 * Tables like `pet` are partitioned by `breed_id` (~450 partitions). Queries
 * that don't include the partition column in the predicate force Postgres to
 * acquire locks on every partition and exhaust `max_locks_per_transaction`.
 *
 * Pass a `PartitionFilter` to APIs that accept it (e.g.
 * `dictionaryStore.getRecordById`) so the partition column is added to the
 * Supabase query and PG can prune to a single partition.
 */
export interface PartitionFilter {
  /** Column name on the partitioned table (e.g. `"breed_id"`). */
  field: string;
  /** Concrete value for that partition column. */
  value: string;
}
