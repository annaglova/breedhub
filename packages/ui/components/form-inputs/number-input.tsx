import React, { forwardRef } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  fieldClassName?: string;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ 
    label, 
    error, 
    required, 
    className, 
    fieldClassName,
    prefix,
    suffix,
    ...props 
  }, ref) => {
    const inputElement = (
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 select-none">
            {prefix}
          </span>
        )}
        <Input
          ref={ref}
          type="number"
          className={cn(
            prefix && "pl-8",
            suffix && "pr-12",
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 select-none">
            {suffix}
          </span>
        )}
      </div>
    );

    if (label || error) {
      return (
        <FormField
          label={label}
          error={error}
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