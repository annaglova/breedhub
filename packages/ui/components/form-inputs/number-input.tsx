import React, { forwardRef, useState, useEffect } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'onBlur'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  fieldClassName?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  validateOnChange?: boolean;
  autoCorrectOnBlur?: boolean;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ 
    label, 
    error: externalError,
    helperText, 
    required, 
    className, 
    fieldClassName,
    prefix,
    suffix,
    min,
    max,
    value,
    onChange,
    onBlur,
    validateOnChange = true,
    autoCorrectOnBlur = true,
    ...props 
  }, ref) => {
    const [internalError, setInternalError] = useState<string>("");
    
    // Combine external and internal errors
    const displayError = externalError || internalError;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const numValue = Number(inputValue);

      // Validate on change if enabled
      if (validateOnChange && inputValue !== "") {
        if (min !== undefined && numValue < min) {
          setInternalError(`Minimum value is ${min}`);
        } else if (max !== undefined && numValue > max) {
          setInternalError(`Maximum value is ${max}`);
        } else {
          setInternalError("");
        }
      } else {
        setInternalError("");
      }

      // Call original onChange after validation
      onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const numValue = Number(e.target.value);

      // Auto-correct on blur if enabled
      if (autoCorrectOnBlur && e.target.value !== "") {
        let correctedValue = numValue;
        
        if (min !== undefined && numValue < min) {
          correctedValue = min;
        } else if (max !== undefined && numValue > max) {
          correctedValue = max;
        }

        if (correctedValue !== numValue) {
          // Create a synthetic change event with the corrected value
          const syntheticEvent = {
            ...e,
            target: {
              ...e.target,
              value: correctedValue.toString()
            },
            currentTarget: {
              ...e.currentTarget,
              value: correctedValue.toString()
            }
          } as React.ChangeEvent<HTMLInputElement>;
          
          // Call onChange with the corrected value
          onChange?.(syntheticEvent);
        }
      }

      // Clear internal error on blur
      setInternalError("");
      
      // Call original onBlur
      onBlur?.(e);
    };

    // Clear internal error when external error changes
    useEffect(() => {
      if (externalError) {
        setInternalError("");
      }
    }, [externalError]);
    const inputElement = (
      <div className="relative">
        {prefix && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <span className="select-none">{prefix}</span>
          </div>
        )}
        <Input
          ref={ref}
          type="number"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          variant={displayError ? "destructive" : "default"}
          className={cn(
            prefix && "pl-10",
            suffix && "pr-16",
            className
          )}
          {...props}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <span className="select-none">{suffix}</span>
          </div>
        )}
      </div>
    );

    if (label || displayError || helperText) {
      return (
        <FormField
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

NumberInput.displayName = "NumberInput";