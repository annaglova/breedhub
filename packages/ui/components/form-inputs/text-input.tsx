import React, { forwardRef } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";

interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  icon?: React.ReactNode;
  fieldClassName?: string;
  touched?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({
    label,
    error,
    helperText,
    required,
    className,
    fieldClassName,
    icon,
    touched = true,
    ...props
  }, ref) => {
    const hasError = touched && !!error;

    const inputElement = (
      <div className="group/field relative">
        <Input
          ref={ref}
          type="text"
          className={cn(
            "peer transition-all duration-200",
            props.disabled && "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed",
            hasError && "border-red-500 hover:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
            !hasError && !props.disabled && "border-gray-300 hover:border-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
            icon && "pl-10",
            className
          )}
          aria-invalid={hasError ? "true" : undefined}
          aria-describedby={hasError ? `${props.id}-error` : undefined}
          {...props}
        />
        {icon && (
          <div className={cn(
            "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors z-10 top-0",
            hasError ? "text-red-400 peer-focus:text-red-500" : "text-gray-400 peer-focus:text-primary-600 peer-hover:text-gray-500"
          )}>
            {icon}
          </div>
        )}
      </div>
    );

    if (label || error || helperText) {
      return (
        <FormField
          label={label}
          error={hasError ? error : undefined}
          helperText={!hasError ? helperText : undefined}
          required={required}
          className={fieldClassName}
          labelClassName={cn(
            "transition-colors",
            hasError ? "text-red-600" : "text-gray-700 group-focus-within:text-primary-600"
          )}
        >
          {inputElement}
        </FormField>
      );
    }

    return inputElement;
  }
);

TextInput.displayName = "TextInput";