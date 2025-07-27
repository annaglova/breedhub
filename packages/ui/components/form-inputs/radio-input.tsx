import React, { forwardRef } from "react";
import { RadioGroup, RadioGroupItem } from "../radio-group";
import { FormField } from "../form-field";
import { Label } from "../label";
import { cn } from "@ui/lib/utils";

interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  options: RadioOption[];
  orientation?: "horizontal" | "vertical";
  fieldClassName?: string;
  className?: string;
  disabled?: boolean;
}

export const RadioInput = forwardRef<HTMLDivElement, RadioInputProps>(
  ({ 
    label, 
    error, 
    required,
    value,
    onValueChange,
    options,
    orientation = "vertical",
    className,
    fieldClassName,
    disabled,
  }, ref) => {
    const radioGroupElement = (
      <RadioGroup
        ref={ref}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        className={cn(
          orientation === "horizontal" ? "flex flex-row space-x-4" : "space-y-2",
          className
        )}
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-start space-x-2">
            <RadioGroupItem
              value={option.value}
              id={`radio-${option.value}`}
              disabled={option.disabled || disabled}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor={`radio-${option.value}`}
                className={cn(
                  "text-base font-medium leading-none",
                  (option.disabled || disabled) && "cursor-not-allowed opacity-70"
                )}
              >
                {option.label}
              </Label>
              {option.description && (
                <p className="text-xs text-gray-500 mt-1">{option.description}</p>
              )}
            </div>
          </div>
        ))}
      </RadioGroup>
    );

    if (label || error) {
      return (
        <FormField
          label={label}
          error={error}
          required={required}
          className={fieldClassName}
        >
          {radioGroupElement}
        </FormField>
      );
    }

    return radioGroupElement;
  }
);

RadioInput.displayName = "RadioInput";