import { describe, expect, it, vi } from "vitest";
import {
  executeLocalEntityQuery,
  filterLocalEntities,
  type LocalEntityRecord,
  type LocalFindQueryOptions,
  type LocalQueryCollection,
} from "../space-local-query.helpers";

interface SelectorCondition {
  $regex?: string;
  $options?: string;
  $gt?: string;
  $lt?: string;
}

function isObjectRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createMockCollection(
  records: LocalEntityRecord[],
): LocalQueryCollection<LocalEntityRecord> {
  const collection = {
    count: vi.fn(() => ({
      exec: vi.fn(async () => records.length),
    })),
    find: vi.fn((options: LocalFindQueryOptions) => ({
      exec: vi.fn(async () => {
        let matched = records.filter((record) =>
          matchesSelector(record, options.selector || {}),
        );

        if (options.sort) {
          matched = sortBySpec(matched, options.sort);
        }

        if (typeof options.limit === "number") {
          matched = matched.slice(0, options.limit);
        }

        return matched.map((record) => ({
          toJSON: () => record,
        }));
      }),
    })),
  } satisfies LocalQueryCollection<LocalEntityRecord>;

  return collection;
}

function matchesSelector(
  record: LocalEntityRecord,
  selector: Record<string, unknown>,
): boolean {
  return Object.entries(selector).every(([field, condition]) => {
    if (field === "_deleted") {
      return (record._deleted ?? false) === condition;
    }

    if (isObjectRecord(condition)) {
      const typedCondition = condition as SelectorCondition;

      if (typeof typedCondition.$regex === "string") {
        return new RegExp(
          typedCondition.$regex,
          typeof typedCondition.$options === "string"
            ? typedCondition.$options
            : "",
        ).test(String(record[field] ?? ""));
      }

      if (typedCondition.$gt !== undefined) {
        const value = record[field] as string | undefined;
        return value !== undefined && value > typedCondition.$gt;
      }

      if (typedCondition.$lt !== undefined) {
        const value = record[field] as string | undefined;
        return value !== undefined && value < typedCondition.$lt;
      }
    }

    return record[field] === condition;
  });
}

function sortBySpec(
  records: LocalEntityRecord[],
  sortSpec: Array<Record<string, "asc" | "desc">>,
) {
  return [...records].sort((left, right) => {
    for (const part of sortSpec) {
      const [[field, direction]] = Object.entries(part);
      const leftValue = left[field] as string | number | undefined;
      const rightValue = right[field] as string | number | undefined;

      if (leftValue === rightValue) {
        continue;
      }

      if (leftValue === undefined) return direction === "asc" ? -1 : 1;
      if (rightValue === undefined) return direction === "asc" ? 1 : -1;

      if (direction === "asc") {
        return leftValue < rightValue ? -1 : 1;
      }

      return leftValue > rightValue ? -1 : 1;
    }

    return 0;
  });
}

describe("space-local-query.helpers", () => {
  it("filters local entities through the collection wrapper", async () => {
    const collection = createMockCollection([
      { id: "1", name: "Alpha", _deleted: false },
      { id: "2", name: "Beta", _deleted: false },
    ]);

    const result = await filterLocalEntities({
      collection,
      entityType: "pet",
      filters: { name: "Alpha" },
      fieldConfigs: {
        name: {
          fieldType: "string",
          operator: "eq",
        },
      },
      limit: 10,
      cursor: null,
      orderBy: {
        field: "id",
        direction: "asc",
        tieBreaker: {
          field: "id",
          direction: "asc",
        },
      },
    });

    expect(result.records.map((record) => record.id)).toEqual(["1"]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBe("1");
  });

  it("returns an empty local result when the collection is missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await filterLocalEntities({
      entityType: "pet",
      filters: {},
      fieldConfigs: {},
      limit: 10,
      cursor: null,
      orderBy: {
        field: "id",
        direction: "asc",
        tieBreaker: {
          field: "id",
          direction: "asc",
        },
      },
    });

    expect(result).toEqual({
      records: [],
      hasMore: false,
      nextCursor: null,
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "[SpaceStore] Collection pet not found for local filtering",
    );
  });

  it("sorts and limits JSONB parameter queries in local mode", async () => {
    const collection = createMockCollection([
      { id: "1", metrics: { score: 5 }, _deleted: false },
      { id: "2", metrics: { score: 12 }, _deleted: false },
      { id: "3", metrics: { score: 9 }, _deleted: false },
    ]);

    const result = await executeLocalEntityQuery({
      collection,
      entityType: "pet",
      filters: {},
      fieldConfigs: {},
      limit: 2,
      cursor: null,
      orderBy: {
        field: "metrics",
        parameter: "score",
        direction: "desc",
        tieBreaker: {
          field: "id",
          direction: "asc",
        },
      },
    });

    expect(result.records.map((record) => record.id)).toEqual(["2", "3"]);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe(9);
  });

  it("applies JSONB cursor after local sort", async () => {
    const collection = createMockCollection([
      { id: "1", metrics: { score: 5 }, _deleted: false },
      { id: "2", metrics: { score: 12 }, _deleted: false },
      { id: "3", metrics: { score: 9 }, _deleted: false },
    ]);

    const result = await executeLocalEntityQuery({
      collection,
      entityType: "pet",
      filters: {},
      fieldConfigs: {},
      limit: 2,
      cursor: "9",
      orderBy: {
        field: "metrics",
        parameter: "score",
        direction: "desc",
        tieBreaker: {
          field: "id",
          direction: "asc",
        },
      },
    });

    expect(result.records.map((record) => record.id)).toEqual(["1"]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBe(5);
  });
});
