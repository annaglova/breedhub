/**
 * Canonical UUIDs for measurement_type and unit reference data.
 *
 * Source of truth: Postgres `measurement_type` and `unit` tables.
 * Mirror these here only for IDs that code branches on (e.g. "is this Weight?")
 * or that anchor strict-SI storage (the base unit per type).
 *
 * Conversion factors (factor_to_base) live in the DB
 * (`unit_by_measurement_type.factor_to_base`) and are loaded at runtime via
 * DictionaryStore — do NOT mirror them here, or the two will drift.
 *
 * See: breedhub-docs/backend/processes/measurements/PET_MEASUREMENT_UNITS.md
 */

export const MEASUREMENT_TYPE_ID = {
  Weight: "f90bb505-2962-4590-b81f-b6c9cd40f7eb",
  Height: "5011379b-60c0-4e8a-bebc-bd08208fe961",
  ChestVolume: "294134fc-97fb-4ba4-8657-4ffa189b912b",
} as const;

export const UNIT_ID = {
  Kg: "ea307506-279e-4db4-bd54-3acd4015ebfb",
  g: "9875daf6-f14a-4bfa-b9d2-704493546184",
  Lbs: "d3523144-d6c9-4421-b81a-8349483f316c",
  Cm: "489f450c-5631-4a9c-b182-f2ff6931399f",
  In: "a1620a5e-b3e9-45cf-a020-42118d64919f",
} as const;

/**
 * SI base unit per measurement_type — the unit values are stored in
 * inside `pet_measurement.value`. All conversions go via these.
 */
export const BASE_UNIT_FOR_MEASUREMENT_TYPE: Record<string, string> = {
  [MEASUREMENT_TYPE_ID.Weight]: UNIT_ID.Kg,
  [MEASUREMENT_TYPE_ID.Height]: UNIT_ID.Cm,
  [MEASUREMENT_TYPE_ID.ChestVolume]: UNIT_ID.Cm,
};

export type MeasurementTypeId =
  (typeof MEASUREMENT_TYPE_ID)[keyof typeof MEASUREMENT_TYPE_ID];

export type UnitId = (typeof UNIT_ID)[keyof typeof UNIT_ID];

/**
 * Semantic marker on a field config (`measurementKind: "weight"`) → measurement_type_id.
 * The single switch that turns on measurement-aware rendering for a NumberInput.
 * Unknown kinds resolve to undefined; renderer treats them as plain numbers.
 */
export const MEASUREMENT_KIND_TO_TYPE_ID: Record<string, MeasurementTypeId> = {
  weight: MEASUREMENT_TYPE_ID.Weight,
  height: MEASUREMENT_TYPE_ID.Height,
  chestVolume: MEASUREMENT_TYPE_ID.ChestVolume,
};

/**
 * Default min/max bounds per kind, in the SI base unit. Applied by
 * `useFormValidation` when an explicit `validation.min`/`max` is absent.
 *
 * - Weight: 0.01 kg–200 kg (DB CHECK already enforces > 0; cap catches grams typed as kg).
 * - Height/ChestVolume: 1 cm–200 cm (matches the 2026-05-05 cleanup pass).
 */
export const MEASUREMENT_KIND_DEFAULT_BOUNDS: Record<
  string,
  { min: number; max: number }
> = {
  weight: { min: 0.01, max: 200 },
  height: { min: 1, max: 200 },
  chestVolume: { min: 1, max: 200 },
};

/**
 * Field-config marker `displayUnit: "g"` (etc.) → unit.id.
 * Forces a specific display unit for measurement-aware inputs, overriding the
 * user's `user_settings.weight_unit_id` / `size_unit_id` preference. Used by
 * the litter weight matrix so newborn puppies are always entered in grams.
 */
export const DISPLAY_UNIT_TO_UNIT_ID: Record<string, UnitId> = {
  kg: UNIT_ID.Kg,
  g: UNIT_ID.g,
  lbs: UNIT_ID.Lbs,
  cm: UNIT_ID.Cm,
  in: UNIT_ID.In,
};
