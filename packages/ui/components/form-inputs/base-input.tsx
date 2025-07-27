import React, { forwardRef, useState, useEffect } from "react";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";

export interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

export interface BaseInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fieldClassName?: string;
  value?: any;
  onChange?: (e: any) => void;
  onBlur?: (e: any) => void;
  validationRules?: ValidationRule[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  autoCorrect?: (value: any) => any;
  autoCorrectOnBlur?: boolean;
}

export function useValidation<T extends BaseInputProps>(props: T) {
  const {
    value,
    onChange,
    onBlur,
    error: externalError,
    required,
    validationRules = [],
    validateOnChange = true,
    validateOnBlur = true,
    autoCorrect,
    autoCorrectOnBlur = false,
  } = props;

  const [internalError, setInternalError] = useState<string>("");
  
  // Combine external and internal errors
  const displayError = externalError || internalError;

  // Add required validation if needed
  const allValidationRules = React.useMemo(() => {
    const rules = [...validationRules];
    if (required && !rules.some(rule => rule.message.includes('required'))) {
      rules.unshift({
        validate: (val) => val !== "" && val !== null && val !== undefined,
        message: "This field is required"
      });
    }
    return rules;
  }, [required, validationRules]);

  const validate = (val: any): string => {
    for (const rule of allValidationRules) {
      if (!rule.validate(val)) {
        return rule.message;
      }
    }
    return "";
  };

  const handleChange = (e: any) => {
    const newValue = e.target?.value !== undefined ? e.target.value : e;
    
    // Validate on change if enabled
    if (validateOnChange && newValue !== "") {
      const error = validate(newValue);
      setInternalError(error);
    } else if (validateOnChange && newValue === "" && required) {
      setInternalError("This field is required");
    } else {
      setInternalError("");
    }

    // Call original onChange
    onChange?.(e);
  };

  const handleBlur = (e: any) => {
    const currentValue = e.target?.value !== undefined ? e.target.value : value;

    // Auto-correct on blur if enabled
    if (autoCorrectOnBlur && autoCorrect && currentValue !== "") {
      const correctedValue = autoCorrect(currentValue);
      
      if (correctedValue !== currentValue && e.target) {
        // Create a synthetic change event with the corrected value
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: correctedValue
          },
          currentTarget: {
            ...e.currentTarget,
            value: correctedValue
          }
        };
        
        // Call onChange with the corrected value
        onChange?.(syntheticEvent);
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

  return {
    displayError,
    handleChange,
    handleBlur,
    validate
  };
}

export interface BaseInputComponentProps extends BaseInputProps {
  children: (props: {
    error: string | undefined;
    onChange: (e: any) => void;
    onBlur: (e: any) => void;
  }) => React.ReactElement;
}

export const BaseInput = forwardRef<HTMLDivElement, BaseInputComponentProps>(
  ({ label, helperText, required, fieldClassName, children, ...props }, ref) => {
    const { displayError, handleChange, handleBlur } = useValidation(props);

    const inputElement = children({
      error: displayError,
      onChange: handleChange,
      onBlur: handleBlur
    });

    if (label || displayError || helperText) {
      return (
        <FormField
          ref={ref}
          label={label}
          error={displayError}
          helperText={!displayError ? helperText : undefined}
          required={required}
          className={fieldClassName}
        >
          {inputElement}
        </FormField>
      );
    }

    return inputElement;
  }
);

BaseInput.displayName = "BaseInput";