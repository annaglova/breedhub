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
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <span className="select-none">{prefix}</span>
          </div>
        )}
        <Input
          ref={ref}
          type="number"
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