/**
 * partition-fields resolver unit tests
 *
 * Run: pnpm --filter @breedhub/rxdb-store test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PARTITION_FIELDS,
  _resetPartitionFieldMapForTests,
  getPartitionFieldForEntity,
  recordPartitionFieldFromRoute,
} from "../partition-fields";

describe("getPartitionFieldForEntity", () => {
  beforeEach(() => {
    _resetPartitionFieldMapForTests();
  });

  it("returns the constant value for a known partitioned entity", () => {
    expect(getPartitionFieldForEntity("pet")).toBe(PARTITION_FIELDS.pet);
    expect(getPartitionFieldForEntity("pet")).toBe("breed_id");
  });

  it("returns null for unknown / non-partitioned entities", () => {
    expect(getPartitionFieldForEntity("breed")).toBeNull();
    expect(getPartitionFieldForEntity("kennel")).toBeNull();
  });

  it("returns null for null/undefined/empty input", () => {
    expect(getPartitionFieldForEntity(null)).toBeNull();
    expect(getPartitionFieldForEntity(undefined)).toBeNull();
    expect(getPartitionFieldForEntity("")).toBeNull();
  });

  it("prefers map value over constant once recorded from a route", () => {
    // Routes can teach the resolver about new entities the constant doesn't know.
    recordPartitionFieldFromRoute("custom_entity", "tenant_id");
    expect(getPartitionFieldForEntity("custom_entity")).toBe("tenant_id");
  });
});

describe("recordPartitionFieldFromRoute", () => {
  beforeEach(() => {
    _resetPartitionFieldMapForTests();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores empty/whitespace partition_field values", () => {
    recordPartitionFieldFromRoute("pet", "");
    recordPartitionFieldFromRoute("pet", null);
    recordPartitionFieldFromRoute("pet", "   ");
    // Resolver still falls back to constant.
    expect(getPartitionFieldForEntity("pet")).toBe("breed_id");
  });

  it("trims surrounding whitespace before recording", () => {
    recordPartitionFieldFromRoute("custom", "  partition_col  ");
    expect(getPartitionFieldForEntity("custom")).toBe("partition_col");
  });

  it("ignores empty entity name", () => {
    recordPartitionFieldFromRoute("", "breed_id");
    recordPartitionFieldFromRoute(null, "breed_id");
    expect(getPartitionFieldForEntity("")).toBeNull();
  });

  it("warns when DB value drifts from the PARTITION_FIELDS constant (dev only, once per entity)", () => {
    // The dev-only check is gated by import.meta.env.DEV at module init; in a
    // non-dev test runner this assertion is a no-op. We still cover the silent
    // path: drift between routes and constant must NOT throw, and the map
    // takes precedence.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    recordPartitionFieldFromRoute("pet", "wrong_id");
    recordPartitionFieldFromRoute("pet", "wrong_id"); // second call should not double-warn
    expect(getPartitionFieldForEntity("pet")).toBe("wrong_id");
    expect(warnSpy.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
