import { describe, expect, it, vi } from "vitest";

import type { BusinessEntity } from "../../types/business-entity.types";
import type { ResolvedReadFromConfig } from "../../types/tab-data.types";
import { applyFiltersViaReadFrom } from "../space-readfrom.helpers";
import type { FilterFieldConfigMap, FilterMap } from "../space-filter.helpers";
import type { KeysetOrderBy } from "../space-keyset.helpers";

const readFrom: ResolvedReadFromConfig = {
  table: "pet_owner",
  parentField: "contact_id",
  entityIdField: "pet_id",
  entityPartitionField: "pet_breed_id",
  parentId: "contact-1",
};

const defaultOrderBy: KeysetOrderBy = {
  field: "id",
  direction: "asc",
  tieBreaker: { field: "id", direction: "asc" },
};

function pet(id: string, fields: Record<string, unknown> = {}): BusinessEntity {
  return { id, ...fields };
}

async function runReadFrom(
  records: BusinessEntity[],
  options: {
    filters?: FilterMap;
    fieldConfigs?: FilterFieldConfigMap;
    orderBy?: KeysetOrderBy;
    limit?: number;
    cursor?: string | null;
  } = {},
) {
  const loadAllForScope = vi.fn(async () => records);

  const result = await applyFiltersViaReadFrom({
    entityType: "pet",
    readFrom,
    filters: options.filters ?? {},
    fieldConfigs: options.fieldConfigs ?? {},
    orderBy: options.orderBy ?? defaultOrderBy,
    limit: options.limit ?? 50,
    cursor: options.cursor ?? null,
    loadAllForScope,
  });

  return { result, loadAllForScope };
}

describe("applyFiltersViaReadFrom", () => {
  it("loads all records and returns total without filters", async () => {
    const records = [
      pet("pet-1"),
      pet("pet-2"),
      pet("pet-3"),
      pet("pet-4"),
      pet("pet-5"),
    ];

    const { result, loadAllForScope } = await runReadFrom(records, {
      limit: 50,
    });

    expect(loadAllForScope).toHaveBeenCalledWith("pet", readFrom);
    expect(result.records).toHaveLength(5);
    expect(result.total).toBe(5);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("applies an eq filter", async () => {
    const records = [
      pet("pet-1", { pet_status_id: "active-uuid" }),
      pet("pet-2", { pet_status_id: "retired-uuid" }),
      pet("pet-3", { pet_status_id: "active-uuid" }),
      pet("pet-4", { pet_status_id: "retired-uuid" }),
    ];

    const { result } = await runReadFrom(records, {
      filters: { pet_status_id: "active-uuid" },
      fieldConfigs: { pet_status_id: { fieldType: "uuid" } },
    });

    expect(result.records.map((record) => record.id)).toEqual([
      "pet-1",
      "pet-3",
    ]);
    expect(result.total).toBe(2);
  });

  it("applies an ilike filter", async () => {
    const records = [
      pet("pet-1", { name: "Rex" }),
      pet("pet-2", { name: "REX Junior" }),
      pet("pet-3", { name: "Max" }),
    ];

    const { result } = await runReadFrom(records, {
      filters: { name: "rex" },
      fieldConfigs: { name: { fieldType: "string", operator: "ilike" } },
    });

    expect(result.records.map((record) => record.name)).toEqual([
      "Rex",
      "REX Junior",
    ]);
    expect(result.total).toBe(2);
  });

  it("sorts ascending", async () => {
    const records = [
      pet("pet-3", { rating: 3 }),
      pet("pet-1", { rating: 1 }),
      pet("pet-2", { rating: 2 }),
    ];

    const { result } = await runReadFrom(records, {
      orderBy: {
        field: "rating",
        direction: "asc",
        tieBreaker: { field: "id", direction: "asc" },
      },
    });

    expect(result.records.map((record) => record.rating)).toEqual([1, 2, 3]);
  });

  it("sorts descending", async () => {
    const records = [
      pet("pet-3", { rating: 3 }),
      pet("pet-1", { rating: 1 }),
      pet("pet-2", { rating: 2 }),
    ];

    const { result } = await runReadFrom(records, {
      orderBy: {
        field: "rating",
        direction: "desc",
        tieBreaker: { field: "id", direction: "asc" },
      },
    });

    expect(result.records.map((record) => record.rating)).toEqual([3, 2, 1]);
  });

  it("keeps nulls last regardless of direction", async () => {
    const records = [
      pet("pet-2", { rating: 2 }),
      pet("pet-null", { rating: null }),
      pet("pet-1", { rating: 1 }),
    ];

    const asc = await runReadFrom(records, {
      orderBy: {
        field: "rating",
        direction: "asc",
        tieBreaker: { field: "id", direction: "asc" },
      },
    });
    const desc = await runReadFrom(records, {
      orderBy: {
        field: "rating",
        direction: "desc",
        tieBreaker: { field: "id", direction: "asc" },
      },
    });

    expect(asc.result.records.map((record) => record.rating)).toEqual([
      1,
      2,
      null,
    ]);
    expect(desc.result.records.map((record) => record.rating)).toEqual([
      2,
      1,
      null,
    ]);
  });

  it("uses id as the tie-breaker", async () => {
    const records = [
      pet("b", { rating: 5 }),
      pet("a", { rating: 5 }),
    ];

    const { result } = await runReadFrom(records, {
      orderBy: {
        field: "rating",
        direction: "asc",
        tieBreaker: { field: "id", direction: "asc" },
      },
    });

    expect(result.records.map((record) => record.id)).toEqual(["a", "b"]);
  });

  it("paginates with offset cursors", async () => {
    const records = Array.from({ length: 7 }, (_, index) =>
      pet(`pet-${index + 1}`),
    );

    const firstPage = await runReadFrom(records, { limit: 3 });
    const secondPage = await runReadFrom(records, {
      limit: 3,
      cursor: firstPage.result.nextCursor,
    });
    const thirdPage = await runReadFrom(records, {
      limit: 3,
      cursor: secondPage.result.nextCursor,
    });

    expect(firstPage.result.records.map((record) => record.id)).toEqual([
      "pet-1",
      "pet-2",
      "pet-3",
    ]);
    expect(firstPage.result.nextCursor).toBe("offset:3");
    expect(firstPage.result.hasMore).toBe(true);
    expect(secondPage.result.records.map((record) => record.id)).toEqual([
      "pet-4",
      "pet-5",
      "pet-6",
    ]);
    expect(secondPage.result.nextCursor).toBe("offset:6");
    expect(secondPage.result.hasMore).toBe(true);
    expect(thirdPage.result.records.map((record) => record.id)).toEqual([
      "pet-7",
    ]);
    expect(thirdPage.result.nextCursor).toBeNull();
    expect(thirdPage.result.hasMore).toBe(false);
  });

  it("returns an empty page for empty input", async () => {
    const { result } = await runReadFrom([]);

    expect(result.records).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("returns an empty page when filters eliminate every record", async () => {
    const records = [
      pet("pet-1", { pet_status_id: "active-uuid" }),
      pet("pet-2", { pet_status_id: "active-uuid" }),
      pet("pet-3", { pet_status_id: "active-uuid" }),
    ];

    const { result } = await runReadFrom(records, {
      filters: { pet_status_id: "retired-uuid" },
      fieldConfigs: { pet_status_id: { fieldType: "uuid" } },
    });

    expect(result.records).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });
});
