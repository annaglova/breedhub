import React, { forwardRef, useState, useEffect } from "react";

export interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

export interface WithValidationProps {
  value?: any;
  onChange?: (e: any) => void;
  onBlur?: (e: any) => void;
  error?: string;
  validationRules?: ValidationRule[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  autoCorrect?: (value: any) => any;
  autoCorrectOnBlur?: boolean;
}

export function withValidation<T extends WithValidationProps>(
  Component: React.ComponentType<T>
) {
  return forwardRef<any, T>((props, ref) => {
    const {
      value,
      onChange,
      onBlur,
      error: externalError,
      validationRules = [],
      validateOnChange = true,
      validateOnBlur = true,
      autoCorrect,
      autoCorrectOnBlur = false,
      ...restProps
    } = props;

    const [internalError, setInternalError] = useState<string>("");
    
    // Combine external and internal errors
    const displayError = externalError || internalError;

    const validate = (val: any): string => {
      for (const rule of validationRules) {
        if (!rule.validate(val)) {
          return rule.message;
        }
      }
      return "";
    };

    const handleChange = (e: any) => {
      const newValue = e.target?.value !== undefined ? e.target.value : e;
      
      // Call original onChange
      onChange?.(e);

      // Validate on change if enabled
      if (validateOnChange && newValue !== "") {
        const error = validate(newValue);
        setInternalError(error);
      } else {
        setInternalError("");
      }
    };

    const handleBlur = (e: any) => {
      const currentValue = e.target?.value !== undefined ? e.target.value : value;

      // Auto-correct on blur if enabled
      if (autoCorrectOnBlur && autoCorrect && currentValue !== "") {
        const correctedValue = autoCorrect(currentValue);
        
        if (correctedValue !== currentValue && e.target) {
          e.target.value = correctedValue;
          // Create a synthetic change event
          const changeEvent = new Event('change', { bubbles: true });
          Object.defineProperty(changeEvent, 'target', { value: e.target, writable: false });
          onChange?.(changeEvent as any);
        }
      }

      // Validate on blur if enabled
      if (validateOnBlur) {
        const finalValue = e.target?.value !== undefined ? e.target.value : value;
        const error = validate(finalValue);
        setInternalError(error);
      }
      
      // Call original onBlur
      onBlur?.(e);
    };

    // Clear internal error when external error changes
    useEffect(() => {
      if (externalError) {
        setInternalError("");
      }
    }, [externalError]);

    return (
      <Component
        {...(restProps as T)}
        ref={ref}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        error={displayError}
      />
    );
  });
}

// Common validation rules
export const ValidationRules = {
  required: (message = "This field is required"): ValidationRule => ({
    validate: (value) => value !== "" && value !== null && value !== undefined,
    message
  }),
  
  min: (min: number, message?: string): ValidationRule => ({
    validate: (value) => Number(value) >= min,
    message: message || `Minimum value is ${min}`
  }),
  
  max: (max: number, message?: string): ValidationRule => ({
    validate: (value) => Number(value) <= max,
    message: message || `Maximum value is ${max}`
  }),
  
  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => String(value).length >= min,
    message: message || `Minimum length is ${min} characters`
  }),
  
  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => String(value).length <= max,
    message: message || `Maximum length is ${max} characters`
  }),
  
  pattern: (pattern: RegExp, message: string): ValidationRule => ({
    validate: (value) => pattern.test(String(value)),
    message
  }),
  
  email: (message = "Invalid email address"): ValidationRule => ({
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)),
    message
  }),
  
  custom: (validateFn: (value: any) => boolean, message: string): ValidationRule => ({
    validate: validateFn,
    message
  })
};

// Auto-correct functions
export const AutoCorrect = {
  minMax: (min?: number, max?: number) => (value: any) => {
    const num = Number(value);
    if (min !== undefined && num < min) return min;
    if (max !== undefined && num > max) return max;
    return num;
  },
  
  trimWhitespace: () => (value: string) => value.trim(),
  
  toLowerCase: () => (value: string) => value.toLowerCase(),
  
  toUpperCase: () => (value: string) => value.toUpperCase(),
  
  removeNonNumeric: () => (value: string) => value.replace(/[^0-9.-]/g, ''),
  
  formatPhone: () => (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return value;
  }
};