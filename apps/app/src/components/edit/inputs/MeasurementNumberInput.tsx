/**
 * MeasurementNumberInput — NumberInput wrapper for measurementKind-tagged fields.
 *
 * Form state always holds SI (kg / cm). This component:
 * - converts the SI value to the user's preferred unit for display
 * - renders the unit name as the input suffix
 * - converts the entered display value back to SI before forwarding onChange
 *
 * Min/max validation also runs against SI — handled by `useFormValidation` via
 * `measurementKind` defaults from MEASUREMENT_KIND_DEFAULT_BOUNDS.
 *
 * If the measurement kind is unknown (config typo) or units aren't loaded yet,
 * the component falls back to plain NumberInput behaviour (no suffix, raw passthrough).
 */
import React from "react";
import { NumberInput } from "@ui/components/form-inputs";
import { useMeasurementUnits } from "@/hooks/useMeasurementUnits";
import { formatMeasurement, toBase } from "@/utils/format-measurement";
import {
  BASE_UNIT_FOR_MEASUREMENT_TYPE,
  MEASUREMENT_KIND_TO_TYPE_ID,
  userSettingsStore,
} from "@breedhub/rxdb-store";
import { useSignals } from "@preact/signals-react/runtime";

interface MeasurementNumberInputProps {
  /** "weight" | "height" | "chestVolume" — semantic marker from field config */
  measurementKind: string;
  /** SI value held in form state (kg / cm), or "" / null / undefined for empty */
  value?: string | number | null;
  /** Receives a synthetic event whose `target.value` is the new SI value (or "") */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  // Pass-through props (label, error, disabled, placeholder, required, helperText, etc.)
  [key: string]: any;
}

export function MeasurementNumberInput({
  measurementKind,
  value,
  onChange,
  ...rest
}: MeasurementNumberInputProps) {
  useSignals();

  const { unitsByType } = useMeasurementUnits();
  const weightUnitId = userSettingsStore.weightUnitId.value;
  const sizeUnitId = userSettingsStore.sizeUnitId.value;

  const measurementTypeId = MEASUREMENT_KIND_TO_TYPE_ID[measurementKind];
  const preferredUnitId =
    measurementKind === "weight" ? weightUnitId : sizeUnitId;

  // Unknown kind → plain NumberInput (silent fail-safe per plan).
  if (!measurementTypeId) {
    return <NumberInput value={value as any} onChange={onChange} {...rest} />;
  }

  const siValue =
    value === "" || value === null || value === undefined
      ? null
      : Number(value);

  const formatted = formatMeasurement(
    siValue,
    measurementTypeId,
    preferredUnitId,
    unitsByType,
  );

  // Round display to 2 decimals; Number() drops trailing zeros so 2.40 → 2.4.
  const displayValue =
    formatted === null
      ? ""
      : Number.isFinite(formatted.display)
        ? Number(formatted.display.toFixed(2))
        : "";

  const suffix = formatted?.unit ?? "";

  // Resolve the unit id we'll round-trip through on input change. Prefer the
  // unit currently rendered (formatted.unitId); fall back to the SI base unit.
  const inputUnitId =
    formatted?.unitId || BASE_UNIT_FOR_MEASUREMENT_TYPE[measurementTypeId];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return;

    const raw = e.target.value;
    if (raw === "") {
      onChange(e);
      return;
    }

    const entered = Number(raw);
    if (Number.isNaN(entered)) {
      onChange(e);
      return;
    }

    // Convert display → SI for form state. If units aren't loaded yet,
    // pass raw through so the form isn't blocked.
    let siNext: number;
    try {
      siNext = toBase(entered, inputUnitId, measurementTypeId, unitsByType);
    } catch {
      onChange(e);
      return;
    }

    const synthetic = {
      ...e,
      target: { ...e.target, value: String(siNext) },
      currentTarget: { ...e.currentTarget, value: String(siNext) },
    } as React.ChangeEvent<HTMLInputElement>;

    onChange(synthetic);
  };

  return (
    <NumberInput
      value={displayValue}
      onChange={handleChange}
      suffix={suffix}
      step={0.01}
      // Don't auto-correct on blur using the parent NumberInput's min/max —
      // bounds are enforced in SI by useFormValidation, not in display units.
      autoCorrectOnBlur={false}
      {...rest}
    />
  );
}
