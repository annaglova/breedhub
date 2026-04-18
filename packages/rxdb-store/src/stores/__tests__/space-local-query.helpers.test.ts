import { describe, expect, it, vi } from "vitest";
import { executeLocalEntityQuery } from "../space-local-query.helpers";

function createMockCollection(records: Record<string, any>[]) {
  return {
    find: vi.fn((options: Record<string, any>) => ({
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
  } as any;
}

function matchesSelector(
  record: Record<string, any>,
  selector: Record<string, any>,
): boolean {
  return Object.entries(selector).every(([field, condition]) => {
    if (field === "_deleted") {
      return (record._deleted ?? false) === condition;
    }

    if (
      condition &&
      typeof condition === "object" &&
      "$regex" in condition &&
      typeof condition.$regex === "string"
    ) {
      return new RegExp(condition.$regex, condition.$options || "").test(
        String(record[field] ?? ""),
      );
    }

    if (condition && typeof condition === "object" && "$gt" in condition) {
      return record[field] > condition.$gt;
    }

    if (condition && typeof condition === "object" && "$lt" in condition) {
      return record[field] < condition.$lt;
    }

    return record[field] === condition;
  });
}

function sortBySpec(
  records: Record<string, any>[],
  sortSpec: Array<Record<string, "asc" | "desc">>,
) {
  return [...records].sort((left, right) => {
    for (const part of sortSpec) {
      const [[field, direction]] = Object.entries(part);
      const leftValue = left[field];
      const rightValue = right[field];

      if (leftValue === rightValue) {
        continue;
      }

      if (direction === "asc") {
        return leftValue < rightValue ? -1 : 1;
      }

      return leftValue > rightValue ? -1 : 1;
    }

    return 0;
  });
}

describe("space-local-query.helpers", () => {
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
