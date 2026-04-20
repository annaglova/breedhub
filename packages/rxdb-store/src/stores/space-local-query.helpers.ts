import type { RxCollection, RxDocument } from "rxdb";
import {
  applyFiltersToRxdbSelector,
  getStringSearchFilters,
} from "./space-filter.helpers";
import type { KeysetOrderBy } from "./space-keyset.helpers";
import { compareValues, getTieBreaker } from "./space-sort.helpers";

export interface LocalEntityQueryResult {
  records: any[];
  hasMore: boolean;
  nextCursor: any;
}

interface LocalEntityQueryOptions {
  collection: RxCollection<any>;
  entityType: string;
  filters: Record<string, any>;
  fieldConfigs: Record<string, any>;
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
  collection?: RxCollection<any>;
  entityType: string;
  filters: Record<string, any>;
  fieldConfigs: Record<string, any>;
  limit: number;
  cursor: string | null;
  orderBy: KeysetOrderBy;
  logMissingCollection?: boolean;
}

function escapeRegexValue(value: any): string {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getLocalOrderValue(
  record: Record<string, any> | null | undefined,
  orderBy: KeysetOrderBy,
): any {
  if (!record) {
    return null;
  }

  return orderBy.parameter
    ? record[orderBy.field]?.[orderBy.parameter]
    : record[orderBy.field];
}

function getLocalTieBreakerValue(
  record: Record<string, any> | null | undefined,
  orderBy: KeysetOrderBy,
): any {
  if (!record) {
    return null;
  }

  const tieBreaker = getTieBreaker(orderBy);
  const tieBreakerValue = tieBreaker.parameter
    ? record[tieBreaker.field]?.[tieBreaker.parameter]
    : record[tieBreaker.field];

  return tieBreakerValue ?? record.id ?? null;
}

export function sortLocalRecords(
  records: Record<string, any>[],
  orderBy: KeysetOrderBy,
): Record<string, any>[] {
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
  selector: Record<string, any>,
  orderBy: KeysetOrderBy,
  limit: number,
): Record<string, any> {
  const queryOptions: Record<string, any> = { selector };

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
  records: Record<string, any>[],
  orderBy: KeysetOrderBy,
  cursor: string | null | undefined,
): Record<string, any>[] {
  if (!cursor || !orderBy.parameter) {
    return records;
  }

  return records.filter((record) => {
    const value = getLocalOrderValue(record, orderBy);
    if (orderBy.direction === "asc") {
      return value > cursor;
    }

    return value < cursor;
  });
}

async function executeLocalSelectorQuery(
  collection: RxCollection<any>,
  selector: Record<string, any>,
  orderBy: KeysetOrderBy,
  options: LocalSelectorQueryOptions,
): Promise<Record<string, any>[]> {
  const docs = await collection
    .find(buildLocalQueryOptions(selector, orderBy, options.limit))
    .exec();

  let records = docs.map((doc: RxDocument<any>) => doc.toJSON());

  if (options.skipIds?.size) {
    records = records.filter((record) => !options.skipIds!.has(record.id));
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
    const startsWithSelector: Record<string, any> = { _deleted: false };

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
      const containsSelector: Record<string, any> = { _deleted: false };
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
          skipIds: new Set(startsWithResults.map((record) => record.id)),
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
      nextCursor: getLocalOrderValue(records[records.length - 1], orderBy) ?? null,
    };
  }

  console.log("[SpaceStore] 🔍 Regular search mode (cursor or no string filters)");

  const selector: Record<string, any> = { _deleted: false };
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
    nextCursor: getLocalOrderValue(records[records.length - 1], orderBy) ?? null,
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
