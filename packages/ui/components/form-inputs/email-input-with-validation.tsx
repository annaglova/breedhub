import { useAutoFillDetection } from "@shared/hooks/useAutoFillDetection";
import { useDebouncedValidation } from "@shared/hooks/useDebouncedValidation";
import { validateEmailAsync } from "@shared/utils/emailValidation";
import { cn } from "@ui/lib/utils";
import { AlertCircle, Info, Loader2, Mail } from "lucide-react";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { FormField } from "../form-field";
import { Input } from "../input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip";

interface EmailInputWithValidationProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fieldClassName?: string;
  touched?: boolean;
  icon?: React.ReactNode;
  showSuggestions?: boolean;
  validateAsync?: boolean;
  onValidationChange?: (isValid: boolean, error?: string) => void;
}

export const EmailInputWithValidation = forwardRef<
  HTMLInputElement,
  EmailInputWithValidationProps
>(
  (
    {
      label,
      error: externalError,
      helperText,
      required,
      className,
      fieldClassName,
      touched = false,
      icon,
      showSuggestions = true,
      validateAsync = true,
      onValidationChange,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [localValue, setLocalValue] = useState(value || "");
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [isDisposable, setIsDisposable] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const isAutoFilled = useAutoFillDetection(inputRef, {
      onAutoFill: (filled) => {
        if (filled && inputRef.current?.value) {
          // Trigger validation when auto-filled
          setLocalValue(inputRef.current.value);
        }
      },
    });

    // Use debounced validation
    const {
      error: validationError,
      isValidating,
      hasValidated,
      validateNow,
    } = useDebouncedValidation(
      localValue,
      async (email: string) => {
        if (!email) {
          setSuggestion(null);
          setIsDisposable(false);
          return null;
        }

        const result = validateAsync
          ? await validateEmailAsync(email)
          : validateEmailAsync(email);

        const validationResult = await result;

        if (validationResult.suggestion && showSuggestions) {
          setSuggestion(validationResult.suggestion);
        } else {
          setSuggestion(null);
        }

        setIsDisposable(validationResult.isDisposable || false);

        return validationResult.isValid
          ? null
          : validationResult.error || "Invalid email";
      },
      { delay: 400 }
    );

    // Notify parent of validation changes
    useEffect(() => {
      if (onValidationChange && hasValidated) {
        onValidationChange(!validationError, validationError || undefined);
      }
    }, [validationError, hasValidated, onValidationChange]);

    // Combine external and validation errors
    const error = externalError || (touched && validationError) || "";
    const hasError = touched && !!error;

    const defaultIcon = <Mail className="h-4 w-4" />;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);

      if (onChange) {
        onChange(e);
      }
    };

    const handleSuggestionClick = () => {
      if (suggestion) {
        const [localPart] = localValue.split("@");
        const newEmail = `${localPart}@${suggestion}`;
        setLocalValue(newEmail);
        setSuggestion(null);

        // Create synthetic event
        const event = {
          target: { value: newEmail },
          currentTarget: { value: newEmail },
        } as React.ChangeEvent<HTMLInputElement>;

        if (onChange) {
          onChange(event);
        }
      }
    };

    const inputElement = (
      <div className="group/field relative">
        <Input
          ref={(el) => {
            inputRef.current = el;
            if (ref) {
              if (typeof ref === "function") {
                ref(el);
              } else {
                ref.current = el;
              }
            }
          }}
          type="email"
          value={localValue}
          onChange={handleChange}
          data-autofilled={isAutoFilled ? "true" : undefined}
          className={cn(
            "peer transition-all duration-200 pl-10",
            props.disabled &&
              "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed",
            hasError &&
              "border-red-500 hover:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
            isDisposable &&
              "border-yellow-500 hover:border-yellow-600 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20",
            isAutoFilled && "!bg-blue-50 !border-blue-300",
            !hasError &&
              !props.disabled &&
              "border-slate-300 hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
            className
          )}
          autoComplete="email"
          aria-invalid={hasError ? "true" : undefined}
          aria-describedby={hasError ? `${props.id}-error` : undefined}
          {...props}
        />

        {/* Icon */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors z-10 top-0",
            hasError
              ? "text-red-400 peer-focus:text-red-500"
              : isDisposable
              ? "text-yellow-500 peer-focus:text-yellow-600"
              : "text-slate-400 peer-focus:text-primary-600 peer-hover:text-slate-500"
          )}
        >
          {icon || defaultIcon}
        </div>

        {/* Status indicators */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center z-10">
          {isValidating && (
            <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
          )}
          {!isValidating && isDisposable && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertCircle className="h-4 w-4 text-yellow-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>This appears to be a disposable email address</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Suggestion tooltip */}
        {suggestion && !hasError && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-sm flex items-center justify-between animate-slideDown">
              <div className="flex items-center space-x-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800">
                  Did you mean{" "}
                  <strong>
                    {localValue.split("@")[0]}@{suggestion}
                  </strong>
                  ?
                </span>
              </div>
              <button
                type="button"
                onClick={handleSuggestionClick}
                className="text-blue-600 hover:text-blue-700  ml-2"
              >
                Yes
              </button>
            </div>
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
            hasError
              ? "text-red-600"
              : isDisposable
              ? "text-yellow-600"
              : "text-slate-700 group-focus-within:text-primary-600"
          )}
        >
          {inputElement}
        </FormField>
      );
    }

    return inputElement;
  }
);

EmailInputWithValidation.displayName = "EmailInputWithValidation";
