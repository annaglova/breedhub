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
    const [isFocused, setIsFocused] = React.useState(false);
    const hasError = touched && error;
    const inputElement = (
      <div className="relative">
        {icon && (
          <div className={cn(
            "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors z-10",
            hasError ? "text-red-400" : "text-gray-400",
            isFocused && !hasError && "text-primary-600"
          )}>
            {icon}
          </div>
        )}
        <Input
          ref={ref}
          type="text"
          className={cn(
            "transition-all",
            icon && "pl-10",
            hasError && "border-red-500 focus:ring-red-500",
            isFocused && !hasError && "border-primary-500 ring-2 ring-primary-500/20",
            className
          )}
          aria-invalid={hasError ? "true" : undefined}
          aria-describedby={hasError ? `${props.id}-error` : undefined}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
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
            hasError && "text-red-600",
            isFocused && !hasError && "text-primary-600"
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