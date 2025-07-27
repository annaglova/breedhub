import React, { forwardRef } from "react";
import { Checkbox } from "../checkbox";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";

interface CheckboxInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  checkboxLabel?: string;
  fieldClassName?: string;
  indeterminate?: boolean;
}

export const CheckboxInput = forwardRef<HTMLInputElement, CheckboxInputProps>(
  ({ 
    label, 
    error,
    helperText, 
    required,
    checked,
    onCheckedChange,
    checkboxLabel,
    className,
    fieldClassName,
    disabled,
    indeterminate,
    ...props 
  }, ref) => {
    const checkboxElement = (
      <div className={cn("flex items-start space-x-3", className)}>
        <Checkbox
          ref={ref}
          checked={indeterminate ? "indeterminate" : checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className="mt-0.5"
          {...props}
        />
        {checkboxLabel && (
          <label
            htmlFor={props.id}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              disabled && "cursor-not-allowed opacity-70"
            )}
          >
            {checkboxLabel}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
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
          {checkboxElement}
        </FormField>
      );
    }

    return checkboxElement;
  }
);

CheckboxInput.displayName = "CheckboxInput";