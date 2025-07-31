import React, { forwardRef } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";
import { Mail, Check } from "lucide-react";
import { determineFieldState, getFieldStateClasses } from "@ui/lib/form-utils";

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
    const [isFocused, setIsFocused] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);
    
    const hasError = touched && !!error;
    const isValid = touched && !error && props.value && props.value !== "";
    
    const fieldState = determineFieldState({
      isFocused,
      isHovered,
      hasError,
      isValid,
      isDisabled: props.disabled,
      touched,
    });
    
    const stateClasses = getFieldStateClasses(fieldState, true);
    const defaultIcon = <Mail className="h-4 w-4" />;
    
    const inputElement = (
      <div 
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={cn(
          "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors z-10",
          stateClasses.icon
        )}>
          {icon || defaultIcon}
        </div>
        {isValid && !isFocused && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-10">
            <Check className="h-4 w-4 text-green-500" />
          </div>
        )}
        <Input
          ref={ref}
          type="email"
          className={cn(
            stateClasses.input,
            isValid && "pr-10",
            className
          )}
          autoComplete="email"
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
            stateClasses.label
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