import {
  applyFiltersToRxdbSelector,
  getStringSearchFilters,
} from "./space-filter.helpers";
import type { KeysetOrderBy } from "./space-keyset.helpers";
import {
  compareValues,
  getTieBreaker,
  type ComparableValue,
} from "./space-sort.helpers";

export interface LocalEntityRecord extends Record<string, unknown> {
  id?: string;
  _deleted?: boolean;
}

export interface LocalQueryCollection<
  TRecord extends LocalEntityRecord = LocalEntityRecord,
> {
  count(): {
    exec(): Promise<unknown>;
  };
  find(options: LocalFindQueryOptions): {
    exec(): Promise<Array<{ toJSON(): TRecord }>>;
  };
}

export interface LocalFindQueryOptions {
  selector: Record<string, unknown>;
  sort?: Array<Record<string, "asc" | "desc">>;
  limit?: number;
}

export interface LocalEntityQueryResult<
  TRecord extends LocalEntityRecord = LocalEntityRecord,
> {
  records: TRecord[];
  hasMore: boolean;
  nextCursor: string | null;
}

interface LocalEntityQueryOptions<
  TRecord extends LocalEntityRecord = LocalEntityRecord,
> {
  collection: LocalQueryCollection<TRecord>;
  entityType: string;
  filters: Record<string, unknown>;
  fieldConfigs: Record<string, unknown>;
  limit: number;
  cursor: string | null;
  orderBy: KeysetOrderBy;
}

interface LocalSelectorQueryOptions {
  limit: number;
  cursor?: string | null;
  skipIds?: Set<string>;
}

export interface FilterLocalEntitiesOptions {
  collection?: LocalQueryCollection;
  entityType: string;
  filters: Record<string, unknown>;
  fieldConfigs: Record<string, unknown>;
  limit: number;
  cursor: string | null;
  orderBy: KeysetOrderBy;
  logMissingCollection?: boolean;
}

function getParameterizedValue(
  value: unknown,
  parameter?: string,
): ComparableValue | null {
  if (!parameter) {
    return (value as ComparableValue | null | undefined) ?? null;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  return ((value as Record<string, unknown>)[parameter] as
    | ComparableValue
    | null
    | undefined) ?? null;
}

function escapeRegexValue(value: unknown): string {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getLocalOrderValue(
  record: LocalEntityRecord | null | undefined,
  orderBy: KeysetOrderBy,
): ComparableValue | null {
  if (!record) {
    return null;
  }

  return getParameterizedValue(record[orderBy.field], orderBy.parameter);
}

function getLocalTieBreakerValue(
  record: LocalEntityRecord | null | undefined,
  orderBy: KeysetOrderBy,
): ComparableValue | null {
  if (!record) {
    return null;
  }

  const tieBreaker = getTieBreaker(orderBy);
  const tieBreakerValue = getParameterizedValue(
    record[tieBreaker.field],
    tieBreaker.parameter,
  );

  return tieBreakerValue ?? record.id ?? null;
}

export function sortLocalRecords<TRecord extends LocalEntityRecord>(
  records: TRecord[],
  orderBy: KeysetOrderBy,
): TRecord[] {
  const tieBreaker = getTieBreaker(orderBy);

  return [...records].sort((leftRecord, rightRecord) => {
    const primaryCompare = compareValues(
      getLocalOrderValue(leftRecord, orderBy),
      getLocalOrderValue(rightRecord, orderBy),
      orderBy.direction,
    );

    if (primaryCompare !== 0) {
      return primaryCompare;
    }

    return compareValues(
      getLocalTieBreakerValue(leftRecord, orderBy),
      getLocalTieBreakerValue(rightRecord, orderBy),
      tieBreaker.direction,
    );
  });
}

function buildLocalQueryOptions(
  selector: Record<string, unknown>,
  orderBy: KeysetOrderBy,
  limit: number,
): LocalFindQueryOptions {
  const queryOptions: LocalFindQueryOptions = { selector };

  if (!orderBy.parameter) {
    const tieBreaker = getTieBreaker(orderBy);
    queryOptions.sort = [
      { [orderBy.field]: orderBy.direction === "asc" ? "asc" : "desc" },
      { [tieBreaker.field]: tieBreaker.direction === "asc" ? "asc" : "desc" },
    ];
    if (limit > 0) {
      queryOptions.limit = limit;
    }
  }

  return queryOptions;
}

function applyLocalJsonbCursor(
  records: LocalEntityRecord[],
  orderBy: KeysetOrderBy,
  cursor: string | null | undefined,
): LocalEntityRecord[] {
  if (!cursor || !orderBy.parameter) {
    return records;
  }

  return records.filter((record) => {
    const value = getLocalOrderValue(record, orderBy);
    if (value === null || value === undefined) {
      return false;
    }

    if (orderBy.direction === "asc") {
      return value > cursor;
    }

    return value < cursor;
  });
}

async function executeLocalSelectorQuery(
  collection: LocalQueryCollection,
  selector: Record<string, unknown>,
  orderBy: KeysetOrderBy,
  options: LocalSelectorQueryOptions,
): Promise<LocalEntityRecord[]> {
  const docs = await collection
    .find(buildLocalQueryOptions(selector, orderBy, options.limit))
    .exec();

  let records = docs.map((doc) => doc.toJSON());

  if (options.skipIds?.size) {
    records = records.filter(
      (record) => record.id === undefined || !options.skipIds?.has(record.id),
    );
  }

  records = sortLocalRecords(records, orderBy);
  records = applyLocalJsonbCursor(records, orderBy, options.cursor);

  if (options.limit > 0) {
    records = records.slice(0, options.limit);
  }

  return records;
}

export async function executeLocalEntityQuery(
  options: LocalEntityQueryOptions,
): Promise<LocalEntityQueryResult> {
  const { collection, entityType, filters, fieldConfigs, limit, cursor, orderBy } =
    options;

  const stringFilters = getStringSearchFilters(filters, fieldConfigs, {
    entityType,
    requireSearchOperator: false,
  });

  if (stringFilters.length > 0 && cursor === null) {
    console.log(
      "[SpaceStore] 🔍 HYBRID SEARCH mode (starts_with 70% + contains 30%)",
    );

    const skipKeys = stringFilters.map(([key]) => key);
    const startsWithLimit = Math.ceil(limit * 0.7);
    const startsWithSelector: Record<string, unknown> = { _deleted: false };

    for (const [fieldKey, value] of stringFilters) {
      startsWithSelector[fieldKey] = {
        $regex: `^${escapeRegexValue(value)}`,
        $options: "i",
      };
    }

    applyFiltersToRxdbSelector(startsWithSelector, filters, fieldConfigs, {
      entityType,
      skipKeys,
    });

    const startsWithResults = await executeLocalSelectorQuery(
      collection,
      startsWithSelector,
      orderBy,
      { limit: startsWithLimit },
    );

    console.log(
      `[SpaceStore] ✅ Got ${startsWithResults.length} starts_with results`,
    );

    const remainingLimit = limit - startsWithResults.length;
    let records = startsWithResults;

    if (remainingLimit > 0) {
      const containsSelector: Record<string, unknown> = { _deleted: false };
      for (const [fieldKey, value] of stringFilters) {
        containsSelector[fieldKey] = {
          $regex: escapeRegexValue(value),
          $options: "i",
        };
      }

      applyFiltersToRxdbSelector(containsSelector, filters, fieldConfigs, {
        entityType,
        skipKeys,
      });

      const containsResults = await executeLocalSelectorQuery(
        collection,
        containsSelector,
        orderBy,
        {
          limit: remainingLimit,
          skipIds: new Set(
            startsWithResults
              .map((record) => record.id)
              .filter((id): id is string => Boolean(id)),
          ),
        },
      );

      console.log(
        `[SpaceStore] ✅ Got ${containsResults.length} contains results (after filtering)`,
      );

      records = [...startsWithResults, ...containsResults];
    }

    console.log(
      `[SpaceStore] 📦 Hybrid search returned ${records.length} total results`,
    );

    return {
      records,
      hasMore: records.length >= limit,
      nextCursor:
        (getLocalOrderValue(
          records[records.length - 1],
          orderBy,
        ) as string | null) ?? null,
    };
  }

  console.log("[SpaceStore] 🔍 Regular search mode (cursor or no string filters)");

  const selector: Record<string, unknown> = { _deleted: false };
  applyFiltersToRxdbSelector(selector, filters, fieldConfigs, {
    entityType,
    preferStringSearchOperator: true,
  });

  if (cursor !== null && !orderBy.parameter) {
    selector[orderBy.field] = {
      [orderBy.direction === "asc" ? "$gt" : "$lt"]: cursor,
    };
    console.log(
      `[SpaceStore] 🔑 Applied cursor: ${orderBy.field} ${
        orderBy.direction === "asc" ? ">" : "<"
      } '${cursor}'`,
    );
  } else if (cursor !== null && orderBy.parameter) {
    console.log(
      `[SpaceStore] 🔑 JSONB cursor (will filter in JS): ${orderBy.field}.${orderBy.parameter} ${
        orderBy.direction === "asc" ? ">" : "<"
      } '${cursor}'`,
    );
  }

  const records = await executeLocalSelectorQuery(collection, selector, orderBy, {
    limit,
    cursor,
  });

  return {
    records,
    hasMore: records.length >= limit,
    nextCursor:
      (getLocalOrderValue(
        records[records.length - 1],
        orderBy,
      ) as string | null) ?? null,
  };
}

export async function filterLocalEntities(
  options: FilterLocalEntitiesOptions,
): Promise<LocalEntityQueryResult> {
  if (!options.collection) {
    if (options.logMissingCollection !== false) {
      console.warn(
        `[SpaceStore] Collection ${options.entityType} not found for local filtering`,
      );
    }
    return { records: [], hasMore: false, nextCursor: null };
  }

  try {
    const totalDocs = await options.collection.count().exec();
    console.log(
      `[SpaceStore] 📊 Collection ${options.entityType} has ${totalDocs} docs in RxDB`,
    );

    const result = await executeLocalEntityQuery({
      collection: options.collection,
      entityType: options.entityType,
      filters: options.filters,
      fieldConfigs: options.fieldConfigs,
      limit: options.limit,
      cursor: options.cursor,
      orderBy: options.orderBy,
    });

    console.log(
      `[SpaceStore] 📦 Local query returned ${result.records.length} results`,
    );

    if (result.records.length > 0) {
      console.log("[SpaceStore] 👁️ First result:", result.records[0]);
    }

    return result;
  } catch (error) {
    console.error("[SpaceStore] ❌ Local filtering error:", error);
    return { records: [], hasMore: false, nextCursor: null };
  }
}
