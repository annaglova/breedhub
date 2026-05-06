/**
 * Unit tests for useMeasurementUnits.
 *
 * Run: pnpm test:app
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const KG = "ea307506-279e-4db4-bd54-3acd4015ebfb";
const G = "9875daf6-f14a-4bfa-b9d2-704493546184";
const LBS = "d3523144-d6c9-4421-b81a-8349483f316c";
const CM = "489f450c-5631-4a9c-b182-f2ff6931399f";
const IN_ = "a1620a5e-b3e9-45cf-a020-42118d64919f";
const WEIGHT = "f90bb505-2962-4590-b81f-b6c9cd40f7eb";
const HEIGHT = "5011379b-60c0-4e8a-bebc-bd08208fe961";

async function loadHook(options?: {
  unitsRecords?: Array<Record<string, unknown>>;
  mappingsRecords?: Array<Record<string, unknown>>;
  unitsError?: Error;
}) {
  vi.resetModules();

  const getDictionary = vi.fn(async (table: string) => {
    if (options?.unitsError && table === "unit") throw options.unitsError;
    if (table === "unit") {
      return {
        records: options?.unitsRecords ?? [
          { id: KG, name: "Kg" },
          { id: G, name: "g" },
          { id: LBS, name: "Lbs" },
          { id: CM, name: "Cm" },
          { id: IN_, name: "In" },
        ],
        total: 5,
        hasMore: false,
        nextCursor: null,
      };
    }
    if (table === "unit_by_measurement_type") {
      return {
        records: options?.mappingsRecords ?? [
          { id: "m1", additional: { unit_id: KG,  measurement_type_id: WEIGHT, factor_to_base: 1,        is_base: true  } },
          { id: "m2", additional: { unit_id: G,   measurement_type_id: WEIGHT, factor_to_base: 0.001,    is_base: false } },
          { id: "m3", additional: { unit_id: LBS, measurement_type_id: WEIGHT, factor_to_base: 0.453592, is_base: false } },
          { id: "m4", additional: { unit_id: CM,  measurement_type_id: HEIGHT, factor_to_base: 1,        is_base: true  } },
          { id: "m5", additional: { unit_id: IN_, measurement_type_id: HEIGHT, factor_to_base: 2.54,     is_base: false } },
        ],
        total: 5,
        hasMore: false,
        nextCursor: null,
      };
    }
    return { records: [], total: 0, hasMore: false, nextCursor: null };
  });

  vi.doMock("@breedhub/rxdb-store", () => ({
    dictionaryStore: { getDictionary },
  }));

  const module = await import("@/hooks/useMeasurementUnits");
  return { useMeasurementUnits: module.useMeasurementUnits, getDictionary };
}

describe("useMeasurementUnits", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("loads unit + unit_by_measurement_type and groups them by measurement_type_id", async () => {
    const { useMeasurementUnits } = await loadHook();
    const { result } = renderHook(() => useMeasurementUnits());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(Object.keys(result.current.unitsByType).sort()).toEqual([HEIGHT, WEIGHT].sort());

    const weight = result.current.unitsByType[WEIGHT];
    expect(weight).toHaveLength(3);
    const kg = weight.find((u) => u.id === KG)!;
    expect(kg).toEqual({ id: KG, name: "Kg", factor_to_base: 1, is_base: true });
    const lbs = weight.find((u) => u.id === LBS)!;
    expect(lbs.factor_to_base).toBeCloseTo(0.453592, 6);
    expect(lbs.is_base).toBe(false);

    const height = result.current.unitsByType[HEIGHT];
    expect(height).toHaveLength(2);
    expect(height.find((u) => u.id === CM)?.is_base).toBe(true);
  });

  it("skips mappings whose unit_id is unknown in the unit dictionary", async () => {
    const { useMeasurementUnits } = await loadHook({
      unitsRecords: [{ id: KG, name: "Kg" }],
      mappingsRecords: [
        { id: "m1", additional: { unit_id: KG, measurement_type_id: WEIGHT, factor_to_base: 1, is_base: true } },
        { id: "m2", additional: { unit_id: "unknown-unit", measurement_type_id: WEIGHT, factor_to_base: 99, is_base: false } },
      ],
    });
    const { result } = renderHook(() => useMeasurementUnits());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.unitsByType[WEIGHT]).toHaveLength(1);
    expect(result.current.unitsByType[WEIGHT][0].id).toBe(KG);
  });

  it("returns empty unitsByType on fetch error", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { useMeasurementUnits } = await loadHook({ unitsError: new Error("boom") });
    const { result } = renderHook(() => useMeasurementUnits());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.unitsByType).toEqual({});
    expect(errSpy).toHaveBeenCalled();
  });
});
