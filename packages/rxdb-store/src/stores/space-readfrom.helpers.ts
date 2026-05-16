import type { ResolvedReadFromConfig } from "../types/tab-data.types";
import type { BusinessEntity } from "../types/business-entity.types";
import type {
  FilterMap,
  FilterFieldConfigMap,
  HydrateFilteredEntitiesResult,
} from "./space-filter.helpers";
import type { KeysetOrderBy } from "./space-keyset.helpers";
import { detectOperator, matchRecordValue } from "../utils/filter-builder";

type OrderBy = KeysetOrderBy;

/**
 * Predicate factory — turns a `filters` map into an in-memory matcher that
 * uses the same operator semantics as the RxDB/Supabase filter builders.
 * Empty filters → returns a matcher that accepts everything.
 */
function buildMemoryMatcher(
  filters: FilterMap,
  fieldConfigs: FilterFieldConfigMap,
): (record: BusinessEntity) => boolean {
  const entries = Object.entries(filters).filter(([, value]) => {
    return value !== undefined && value !== null && value !== "";
  });
  if (entries.length === 0) return () => true;

  return (record) => {
    for (const [key, value] of entries) {
      const cfg = fieldConfigs?.[key] as
        | { fieldType?: string; operator?: string }
        | undefined;
      const operator = detectOperator(cfg?.fieldType ?? "string", cfg?.operator);
      const recordValue = (record as Record<string, unknown>)[key];
      if (!matchRecordValue(recordValue, operator, value)) return false;
    }
    return true;
  };
}

/**
 * Simple ascending/descending comparator on a single field with an id
 * tie-breaker. Sufficient for the small datasets the readFrom path serves
 * (tens of records — owner/breeder mappings). If we ever need composite
 * ordering, lift this to share with `buildLiveSorter`.
 */
function buildMemorySorter(
  orderBy: OrderBy,
): (a: BusinessEntity, b: BusinessEntity) => number {
  const field = orderBy.field;
  const dir = orderBy.direction === "desc" ? -1 : 1;
  const tieField = orderBy.tieBreaker?.field ?? "id";
  const tieDir = orderBy.tieBreaker?.direction === "desc" ? -1 : 1;
  return (a, b) => {
    const av = (a as Record<string, unknown>)[field];
    const bv = (b as Record<string, unknown>)[field];
    if (av == null && bv == null) {
      // fall through to tiebreaker
    } else if (av == null) return 1; // nulls last
    else if (bv == null) return -1;
    else if (av < bv) return -1 * dir;
    else if (av > bv) return 1 * dir;
    const at = (a as Record<string, unknown>)[tieField];
    const bt = (b as Record<string, unknown>)[tieField];
    if (at == null && bt == null) return 0;
    if (at == null) return 1;
    if (bt == null) return -1;
    if (at < bt) return -1 * tieDir;
    if (at > bt) return 1 * tieDir;
    return 0;
  };
}

export interface ApplyFiltersViaReadFromArgs {
  entityType: string;
  readFrom: ResolvedReadFromConfig;
  filters: FilterMap;
  fieldConfigs: FilterFieldConfigMap;
  orderBy: OrderBy;
  limit: number;
  cursor: string | null;
  /**
   * Mapping-load implementation — provided by the caller (SpaceStore) so this
   * helper stays free of `this`-bound dependencies. Returns the full
   * pre-filtered entity list for the active scope (e.g. all of contact's owned
   * pets) with partition-pruned RxDB hydration already done.
   */
  loadAllForScope: (
    entityType: string,
    readFrom: ResolvedReadFromConfig,
  ) => Promise<BusinessEntity[]>;
}

/**
 * Run a space `applyFilters` cycle through a mapping-table source (readFrom):
 *
 * 1. Load ALL entities for the active scope via the mapping table (one indexed
 *    `WHERE contact_id = …` query → `(pet_id, pet_breed_id)` pairs →
 *    partition-pruned pet hydration).
 * 2. Apply heavy `filters` in-memory using the same operator semantics as the
 *    main applyFilters path.
 * 3. Sort + paginate in-memory.
 *
 * Trade-off: the whole scope is fetched up front, then filters narrow on the
 * client. Fine for "my pets"-style spaces where the scope tops out in the low
 * hundreds. If a mapping-backed space ever grows past ~500 rows, replace step
 * 2 with a server-side `pet WHERE id IN (...) AND <filters>` pass (still
 * partition-pruned because mapping returns breed_id alongside id).
 */
export async function applyFiltersViaReadFrom(
  args: ApplyFiltersViaReadFromArgs,
): Promise<HydrateFilteredEntitiesResult<BusinessEntity>> {
  const { entityType, readFrom, filters, fieldConfigs, orderBy, limit, cursor, loadAllForScope } = args;

  const all = await loadAllForScope(entityType, readFrom);
  const matcher = buildMemoryMatcher(filters, fieldConfigs);
  const sorter = buildMemorySorter(orderBy);
  const filtered = all.filter(matcher).sort(sorter);

  // Cursor for the readFrom path is a simple offset (we don't have a stable
  // server-side cursor, and the dataset is small). Format: "offset:N".
  const offset = cursor?.startsWith("offset:")
    ? Number.parseInt(cursor.slice("offset:".length), 10) || 0
    : 0;
  const page = filtered.slice(offset, offset + limit);
  const nextOffset = offset + page.length;
  const hasMore = nextOffset < filtered.length;

  return {
    records: page,
    total: filtered.length,
    hasMore,
    nextCursor: hasMore ? `offset:${nextOffset}` : null,
  };
}
