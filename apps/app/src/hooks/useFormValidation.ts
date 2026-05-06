/**
 * useFormValidation - Shared validation logic for edit forms and filter dialogs.
 *
 * Supports:
 * - required: auto-message "${displayName} is required"
 * - maxLength: auto-message "Maximum ${N} characters" (from validation.maxLength or top-level maxLength)
 * - pattern: custom { value, message } from validation.pattern
 * - numeric min/max (SI): explicit `validation.min`/`max` or defaults via `measurementKind`
 */
import { useCallback, useState } from "react";
import { MEASUREMENT_KIND_DEFAULT_BOUNDS } from "@breedhub/rxdb-store";

interface FieldValidationConfig {
  displayName?: string;
  required?: boolean;
  maxLength?: number;
  /**
   * Semantic measurement marker (e.g. "weight", "height"). When set, default
   * numeric bounds from MEASUREMENT_KIND_DEFAULT_BOUNDS apply unless explicit
   * `validation.min`/`max` override them. Validation runs against the SI value
   * held in form state — never the display value.
   */
  measurementKind?: string;
  validation?: {
    maxLength?: number;
    notNull?: boolean;
    pattern?: { value: string; message: string };
    /** Numeric bounds in SI base unit. */
    min?: number;
    max?: number;
    minMessage?: string;
    maxMessage?: string;
  };
}

export function useFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  /** Validate a single field value. Returns error message or null. */
  const validateField = useCallback(
    (fieldConfig: FieldValidationConfig, value: any): string | null => {
      const val = typeof value === "string" ? value.trim() : value;
      const displayName = fieldConfig.displayName || "Field";

      // required
      if (fieldConfig.required && (!val || val === "")) {
        return `${displayName} is required`;
      }

      if (typeof val === "string" && val.length > 0) {
        // maxLength (from validation or top-level)
        const maxLen =
          fieldConfig.validation?.maxLength || fieldConfig.maxLength;
        if (maxLen && val.length > maxLen) {
          return `Maximum ${maxLen} characters`;
        }

        // pattern (custom)
        if (fieldConfig.validation?.pattern) {
          const { value: patternValue, message } =
            fieldConfig.validation.pattern;
          if (!new RegExp(patternValue).test(val)) {
            return message || "Invalid format";
          }
        }
      }

      // Numeric min/max — explicit `validation.min`/`max` win, otherwise fall
      // back to `measurementKind` defaults. Bounds are in SI; the renderer
      // formats the message into the display unit when it shows the error.
      if (val !== null && val !== undefined && val !== "") {
        const numVal = typeof val === "number" ? val : Number(val);
        if (!Number.isNaN(numVal)) {
          const kindBounds = fieldConfig.measurementKind
            ? MEASUREMENT_KIND_DEFAULT_BOUNDS[fieldConfig.measurementKind]
            : undefined;
          const min =
            fieldConfig.validation?.min !== undefined
              ? fieldConfig.validation.min
              : kindBounds?.min;
          const max =
            fieldConfig.validation?.max !== undefined
              ? fieldConfig.validation.max
              : kindBounds?.max;

          if (min !== undefined && numVal < min) {
            return (
              fieldConfig.validation?.minMessage ?? `Minimum value is ${min}`
            );
          }
          if (max !== undefined && numVal > max) {
            return (
              fieldConfig.validation?.maxMessage ?? `Maximum value is ${max}`
            );
          }
        }
      }

      return null;
    },
    []
  );

  /** Validate all fields. Returns true if valid. */
  const validateAll = useCallback(
    (
      fields: Record<string, FieldValidationConfig>,
      getValue: (key: string) => any,
      getKey?: (fieldId: string) => string
    ): boolean => {
      const newErrors: Record<string, string> = {};
      const keyFn = getKey || ((id: string) => id);

      for (const [fieldId, fieldConfig] of Object.entries(fields)) {
        const key = keyFn(fieldId);
        const value = getValue(key);
        const error = validateField(fieldConfig, value);
        if (error) {
          newErrors[key] = error;
        }
      }

      setErrors(newErrors);

      if (Object.keys(newErrors).length > 0) {
        const allTouched: Record<string, boolean> = {};
        for (const key of Object.keys(newErrors)) {
          allTouched[key] = true;
        }
        setTouched((prev) => ({ ...prev, ...allTouched }));
      }

      return Object.keys(newErrors).length === 0;
    },
    [validateField]
  );

  /** Mark field as touched and validate it in real-time */
  const touchAndValidate = useCallback(
    (key: string, fieldConfig: FieldValidationConfig, value: any) => {
      setTouched((prev) => ({ ...prev, [key]: true }));
      const error = validateField(fieldConfig, value);
      setErrors((prev) => {
        if (error) return { ...prev, [key]: error };
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    },
    [validateField]
  );

  /** Reset validation state */
  const resetValidation = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    errors,
    touched,
    validateField,
    validateAll,
    touchAndValidate,
    resetValidation,
  };
}
