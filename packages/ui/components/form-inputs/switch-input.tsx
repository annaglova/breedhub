import React, { forwardRef } from "react";
import { Switch } from "../switch";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";

interface SwitchInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  switchLabel?: string;
  description?: string;
  fieldClassName?: string;
  className?: string;
  disabled?: boolean;
}

export const SwitchInput = forwardRef<HTMLButtonElement, SwitchInputProps>(
  ({ 
    label, 
    error,
    helperText, 
    required,
    checked,
    onCheckedChange,
    switchLabel,
    description,
    className,
    fieldClassName,
    disabled,
  }, ref) => {
    const switchElement = (
      <div className={cn("flex items-start space-x-3", className)}>
        <Switch
          ref={ref}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
        {(switchLabel || description) && (
          <div className="flex-1">
            {switchLabel && (
              <label
                className={cn(
                  "text-base font-medium leading-none",
                  disabled && "cursor-not-allowed opacity-70"
                )}
              >
                {switchLabel}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
        )}
      </div>
    );

    if (label || error || helperText) {
      return (
        <FormField
          label={label}
          error={error}
          helperText={!error ? helperText : undefined}
          required={required}
          className={fieldClassName}
        >
          {switchElement}
        </FormField>
      );
    }

    return switchElement;
  }
);

SwitchInput.displayName = "SwitchInput";