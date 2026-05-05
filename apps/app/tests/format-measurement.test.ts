/**
 * Unit tests for format-measurement.
 *
 * Run: pnpm test:app
 */

import { describe, it, expect } from "vitest";
import {
  formatMeasurement,
  toBase,
  type UnitsByType,
} from "@/utils/format-measurement";
import {
  MEASUREMENT_TYPE_ID,
  UNIT_ID,
} from "@breedhub/rxdb-store";

const unitsByType: UnitsByType = {
  [MEASUREMENT_TYPE_ID.Weight]: [
    { id: UNIT_ID.Kg,  name: "Kg",  factor_to_base: 1,        is_base: true  },
    { id: UNIT_ID.g,   name: "g",   factor_to_base: 0.001,    is_base: false },
    { id: UNIT_ID.Lbs, name: "Lbs", factor_to_base: 0.453592, is_base: false },
  ],
  [MEASUREMENT_TYPE_ID.Height]: [
    { id: UNIT_ID.Cm, name: "Cm", factor_to_base: 1,    is_base: true  },
    { id: UNIT_ID.In, name: "In", factor_to_base: 2.54, is_base: false },
  ],
  [MEASUREMENT_TYPE_ID.ChestVolume]: [
    { id: UNIT_ID.Cm, name: "Cm", factor_to_base: 1,    is_base: true  },
    { id: UNIT_ID.In, name: "In", factor_to_base: 2.54, is_base: false },
  ],
};

describe("formatMeasurement", () => {
  it("returns null for null/undefined value", () => {
    expect(formatMeasurement(null, MEASUREMENT_TYPE_ID.Weight, UNIT_ID.Kg, unitsByType)).toBeNull();
    expect(formatMeasurement(undefined, MEASUREMENT_TYPE_ID.Weight, UNIT_ID.Kg, unitsByType)).toBeNull();
  });

  it("displays in base unit when preferredUnitId is null/undefined", () => {
    expect(formatMeasurement(15, MEASUREMENT_TYPE_ID.Weight, null, unitsByType))
      .toEqual({ display: 15, unit: "Kg", unitId: UNIT_ID.Kg });
    expect(formatMeasurement(180, MEASUREMENT_TYPE_ID.Height, undefined, unitsByType))
      .toEqual({ display: 180, unit: "Cm", unitId: UNIT_ID.Cm });
  });

  it("is a no-op when preferred unit equals base", () => {
    expect(formatMeasurement(25.5, MEASUREMENT_TYPE_ID.Weight, UNIT_ID.Kg, unitsByType))
      .toEqual({ display: 25.5, unit: "Kg", unitId: UNIT_ID.Kg });
  });

  it("converts kg → lbs", () => {
    const r = formatMeasurement(10, MEASUREMENT_TYPE_ID.Weight, UNIT_ID.Lbs, unitsByType);
    expect(r?.unit).toBe("Lbs");
    expect(r?.unitId).toBe(UNIT_ID.Lbs);
    expect(r?.display).toBeCloseTo(10 / 0.453592, 4); // ≈ 22.0462
  });

  it("converts kg → grams", () => {
    expect(formatMeasurement(0.5, MEASUREMENT_TYPE_ID.Weight, UNIT_ID.g, unitsByType))
      .toEqual({ display: 500, unit: "g", unitId: UNIT_ID.g });
  });

  it("converts cm → inches", () => {
    const r = formatMeasurement(50.8, MEASUREMENT_TYPE_ID.Height, UNIT_ID.In, unitsByType);
    expect(r?.unit).toBe("In");
    expect(r?.display).toBeCloseTo(20, 6); // 50.8 / 2.54 = 20
  });

  it("falls back to base when preferred unit is not allowed for the type", () => {
    // user prefers Lbs for height — nonsensical, fall back to Cm
    expect(formatMeasurement(180, MEASUREMENT_TYPE_ID.Height, UNIT_ID.Lbs, unitsByType))
      .toEqual({ display: 180, unit: "Cm", unitId: UNIT_ID.Cm });
  });

  it("returns raw value with empty unit for unknown measurement_type", () => {
    expect(formatMeasurement(7, "unknown-type-id", null, unitsByType))
      .toEqual({ display: 7, unit: "", unitId: "" });
  });
});

describe("toBase", () => {
  it("is identity when entered unit is the base", () => {
    expect(toBase(15, UNIT_ID.Kg, MEASUREMENT_TYPE_ID.Weight, unitsByType)).toBe(15);
    expect(toBase(180, UNIT_ID.Cm, MEASUREMENT_TYPE_ID.Height, unitsByType)).toBe(180);
  });

  it("converts grams → kg", () => {
    expect(toBase(500, UNIT_ID.g, MEASUREMENT_TYPE_ID.Weight, unitsByType)).toBeCloseTo(0.5, 6);
  });

  it("converts lbs → kg", () => {
    expect(toBase(10, UNIT_ID.Lbs, MEASUREMENT_TYPE_ID.Weight, unitsByType))
      .toBeCloseTo(4.53592, 5);
  });

  it("converts inches → cm", () => {
    expect(toBase(20, UNIT_ID.In, MEASUREMENT_TYPE_ID.Height, unitsByType))
      .toBeCloseTo(50.8, 6);
  });

  it("formatMeasurement and toBase are inverses (round-trip)", () => {
    const original = 22.046;
    const stored = toBase(original, UNIT_ID.Lbs, MEASUREMENT_TYPE_ID.Weight, unitsByType);
    const back = formatMeasurement(stored, MEASUREMENT_TYPE_ID.Weight, UNIT_ID.Lbs, unitsByType);
    expect(back?.display).toBeCloseTo(original, 4);
  });

  it("throws for unknown measurement_type", () => {
    expect(() => toBase(1, UNIT_ID.Kg, "unknown-type", unitsByType))
      .toThrow(/no units known for measurement_type/);
  });

  it("throws when entered unit is not allowed for the type", () => {
    expect(() => toBase(1, UNIT_ID.Lbs, MEASUREMENT_TYPE_ID.Height, unitsByType))
      .toThrow(/not allowed for measurement_type/);
  });
});
