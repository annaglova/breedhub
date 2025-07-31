import React, { forwardRef } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";
import { Check } from "lucide-react";
import { determineFieldState, getFieldStateClasses } from "@ui/lib/form-utils";

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
    
    const stateClasses = getFieldStateClasses(fieldState, !!icon);
    
    const inputElement = (
      <div 
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {icon && (
          <div className={cn(
            "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors z-10",
            stateClasses.icon
          )}>
            {icon}
          </div>
        )}
        {isValid && !isFocused && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-10">
            <Check className="h-4 w-4 text-green-500" />
          </div>
        )}
        <Input
          ref={ref}
          type="text"
          className={cn(
            stateClasses.input,
            isValid && !icon && "pr-10",
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

TextInput.displayName = "TextInput";