/**
 * Strict-SI measurement formatting.
 *
 * `pet_measurement.value` is always stored in the base unit for its
 * measurement_type (Kg for Weight, Cm for Height/Chest volume).
 * `formatMeasurement` converts that stored value to the user's preferred
 * unit for display; `toBase` does the inverse for form input.
 *
 * Conversion factors come from `unit_by_measurement_type.factor_to_base`,
 * loaded at runtime via DictionaryStore — pass them in via `unitsByType`.
 *
 * See: breedhub-docs/backend/processes/measurements/PET_MEASUREMENT_UNITS.md
 */

import { BASE_UNIT_FOR_MEASUREMENT_TYPE } from "@breedhub/rxdb-store";

export interface UnitInfo {
  /** unit.id */
  id: string;
  /** unit.name — used as display label (e.g. "Kg", "Cm", "Lbs") */
  name: string;
  /** unit_by_measurement_type.factor_to_base — multiply entered value by this to get base */
  factor_to_base: number;
  /** unit_by_measurement_type.is_base */
  is_base: boolean;
}

/** measurement_type_id → list of allowed units for that type */
export type UnitsByType = Record<string, UnitInfo[]>;

export interface FormattedMeasurement {
  /** value in the chosen display unit */
  display: number;
  /** unit name to render after the number, e.g. "Kg" */
  unit: string;
  /** id of the unit `display` is in — useful for downstream toBase if user edits */
  unitId: string;
}

/**
 * Convert SI-stored value to user's preferred unit for display.
 *
 * Falls back to the base unit when:
 * - `preferredUnitId` is null/undefined,
 * - the preferred unit is not declared for this measurement_type, or
 * - the conversion factor is missing/zero.
 *
 * Returns `null` for null/undefined `valueInBase`.
 */
export function formatMeasurement(
  valueInBase: number | null | undefined,
  measurementTypeId: string,
  preferredUnitId: string | null | undefined,
  unitsByType: UnitsByType,
): FormattedMeasurement | null {
  if (valueInBase === null || valueInBase === undefined) return null;

  const units = unitsByType[measurementTypeId];
  if (!units || units.length === 0) {
    // unknown measurement_type — best we can do is return the raw number
    return { display: valueInBase, unit: "", unitId: "" };
  }

  const base = pickBase(units, measurementTypeId);
  const target = preferredUnitId
    ? units.find((u) => u.id === preferredUnitId)
    : undefined;

  if (!target || !target.factor_to_base) {
    return { display: valueInBase, unit: base.name, unitId: base.id };
  }

  return {
    display: valueInBase / target.factor_to_base,
    unit: target.name,
    unitId: target.id,
  };
}

/**
 * Convert a value entered in `enteredUnitId` to the SI base unit for storage.
 *
 * Throws if `enteredUnitId` is unknown — input forms must always supply a
 * unit id that exists in `unitsByType` for the field's measurement_type.
 */
export function toBase(
  enteredValue: number,
  enteredUnitId: string,
  measurementTypeId: string,
  unitsByType: UnitsByType,
): number {
  const units = unitsByType[measurementTypeId];
  if (!units) {
    throw new Error(
      `toBase: no units known for measurement_type ${measurementTypeId}`,
    );
  }

  const entered = units.find((u) => u.id === enteredUnitId);
  if (!entered) {
    throw new Error(
      `toBase: unit ${enteredUnitId} is not allowed for measurement_type ${measurementTypeId}`,
    );
  }

  return enteredValue * entered.factor_to_base;
}

function pickBase(units: UnitInfo[], measurementTypeId: string): UnitInfo {
  const flagged = units.find((u) => u.is_base);
  if (flagged) return flagged;

  // fallback: trust the constants table for the canonical base unit
  const canonicalId = BASE_UNIT_FOR_MEASUREMENT_TYPE[measurementTypeId];
  const canonical = units.find((u) => u.id === canonicalId);
  if (canonical) return canonical;

  // last resort: pretend the first unit is base (preserves SI display value)
  return units[0];
}
