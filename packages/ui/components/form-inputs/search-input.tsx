import React, { forwardRef, useState, useEffect, useCallback } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";
import { Search, X } from "lucide-react";

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fieldClassName?: string;
  touched?: boolean;
  /** Current search value */
  value?: string;
  /** Callback when value changes (after debounce if set) */
  onValueChange?: (value: string) => void;
  /** Callback for immediate value changes (before debounce) */
  onImmediateChange?: (value: string) => void;
  /** Debounce delay in milliseconds (0 = no debounce) */
  debounceMs?: number;
  /** Use pill/rounded-full style */
  pill?: boolean;
  /** Show clear button when there's text */
  showClearButton?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({
    label,
    error,
    helperText,
    required,
    className,
    fieldClassName,
    touched = true,
    value = "",
    onValueChange,
    onImmediateChange,
    debounceMs = 0,
    pill = false,
    showClearButton = true,
    placeholder = "Search...",
    disabled,
    ...props
  }, ref) => {
    const hasError = touched && !!error;

    // Internal state for immediate updates
    const [internalValue, setInternalValue] = useState(value);

    // Sync internal value when external value changes
    useEffect(() => {
      setInternalValue(value);
    }, [value]);

    // Debounced callback
    useEffect(() => {
      if (debounceMs <= 0) return;

      const timer = setTimeout(() => {
        if (internalValue !== value) {
          onValueChange?.(internalValue);
        }
      }, debounceMs);

      return () => clearTimeout(timer);
    }, [internalValue, debounceMs, onValueChange, value]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInternalValue(newValue);
      onImmediateChange?.(newValue);

      // If no debounce, call onValueChange immediately
      if (debounceMs <= 0) {
        onValueChange?.(newValue);
      }
    }, [debounceMs, onValueChange, onImmediateChange]);

    const handleClear = useCallback(() => {
      setInternalValue("");
      onImmediateChange?.("");
      onValueChange?.("");
    }, [onValueChange, onImmediateChange]);

    const inputElement = (
      <div className={cn("group/field relative", className)}>
        {/* Search icon */}
        <div className={cn(
          "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors z-10",
          hasError ? "text-red-400" : "text-slate-400 group-focus-within/field:text-primary-600"
        )}>
          <Search className="h-4 w-4" />
        </div>

        <Input
          ref={ref}
          type="text"
          value={internalValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "peer pl-10 w-full transition-all duration-200",
            showClearButton && internalValue && "pr-10",
            pill && "rounded-full",
            disabled && "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed",
            hasError && "border-red-500 hover:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
            !hasError && !disabled && "border-slate-300 hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          )}
          aria-invalid={hasError ? "true" : undefined}
          aria-describedby={hasError ? `${props.id}-error` : undefined}
          {...props}
        />

        {/* Clear button */}
        {showClearButton && internalValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              "absolute inset-y-0 right-0 pr-3 flex items-center transition-colors",
              hasError ? "text-red-400 hover:text-red-600" : "text-slate-400 hover:text-slate-600"
            )}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
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
            hasError ? "text-red-600" : "text-slate-700 group-focus-within:text-primary-600"
          )}
        >
          {inputElement}
        </FormField>
      );
    }

    return inputElement;
  }
);

SearchInput.displayName = "SearchInput";
