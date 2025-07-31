import React, { forwardRef } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";
import { Mail, Check } from "lucide-react";

interface EmailInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fieldClassName?: string;
  touched?: boolean;
  icon?: React.ReactNode;
}

export const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(
  ({ 
    label, 
    error,
    helperText, 
    required, 
    className, 
    fieldClassName,
    touched = true,
    icon,
    ...props 
  }, ref) => {
    const hasError = touched && !!error;
    const isValid = touched && !error && props.value && props.value !== "";
    const defaultIcon = <Mail className="h-4 w-4" />;
    
    const inputElement = (
      <div className="group/field relative">
        <Input
          ref={ref}
          type="email"
          className={cn(
            "peer transition-all duration-200 pl-10",
            props.disabled && "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed",
            hasError && "border-red-500 hover:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
            isValid && !props.disabled && "border-green-500 hover:border-green-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 pr-10",
            !hasError && !isValid && !props.disabled && "border-gray-300 hover:border-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
            className
          )}
          autoComplete="email"
          aria-invalid={hasError ? "true" : undefined}
          aria-describedby={hasError ? `${props.id}-error` : undefined}
          {...props}
        />
        <div className={cn(
          "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors z-10 top-0",
          hasError ? "text-red-400 peer-focus:text-red-500" : 
          isValid ? "text-green-500 peer-focus:text-green-600" :
          "text-gray-400 peer-focus:text-primary-600 peer-hover:text-gray-500"
        )}>
          {icon || defaultIcon}
        </div>
        {isValid && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-10 peer-focus:opacity-0">
            <Check className="h-4 w-4 text-green-500" />
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
            hasError ? "text-red-600" :
            isValid ? "text-green-600" :
            "text-gray-700 group-focus-within:text-primary-600"
          )}
        >
          {inputElement}
        </FormField>
      );
    }

    return inputElement;
  }
);

EmailInput.displayName = "EmailInput";