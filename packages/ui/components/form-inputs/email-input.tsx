import React, { forwardRef } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";
import { Mail } from "lucide-react";

interface EmailInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fieldClassName?: string;
}

export const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(
  ({ 
    label, 
    error,
    helperText, 
    required, 
    className, 
    fieldClassName,
    ...props 
  }, ref) => {
    const inputElement = (
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Mail className="h-4 w-4" />
        </div>
        <Input
          ref={ref}
          type="email"
          className={cn(
            "pl-10",
            className
          )}
          autoComplete="email"
          {...props}
        />
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
          {inputElement}
        </FormField>
      );
    }

    return inputElement;
  }
);

EmailInput.displayName = "EmailInput";