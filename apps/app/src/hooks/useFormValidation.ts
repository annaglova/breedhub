/**
 * useFormValidation - Shared validation logic for edit forms and filter dialogs.
 *
 * Supports:
 * - required: auto-message "${displayName} is required"
 * - maxLength: auto-message "Maximum ${N} characters" (from validation.maxLength or top-level maxLength)
 * - pattern: custom { value, message } from validation.pattern
 */
import { useCallback, useState } from "react";

interface FieldValidationConfig {
  displayName?: string;
  required?: boolean;
  maxLength?: number;
  validation?: {
    maxLength?: number;
    notNull?: boolean;
    pattern?: { value: string; message: string };
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
