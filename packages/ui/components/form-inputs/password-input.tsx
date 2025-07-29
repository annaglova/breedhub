import React, { forwardRef, useState } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";
import { Eye, EyeOff, Lock } from "lucide-react";

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  showStrengthIndicator?: boolean;
  onStrengthChange?: (strength: number) => void;
  fieldClassName?: string;
  showIcon?: boolean;
  touched?: boolean;
  onPasswordToggleChange?: (show: boolean) => void;
}

// Simple password strength calculator
const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: "", color: "" };
  
  let score = 0;
  
  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  // Determine strength label and color
  if (score <= 2) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 4) return { score: 2, label: "Fair", color: "bg-yellow-500" };
  if (score <= 5) return { score: 3, label: "Good", color: "bg-blue-500" };
  return { score: 4, label: "Strong", color: "bg-green-500" };
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ 
    label, 
    error,
    helperText, 
    required, 
    className, 
    fieldClassName,
    showStrengthIndicator = false,
    onStrengthChange,
    showIcon = true,
    touched = true,
    onPasswordToggleChange,
    value,
    onChange,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [strength, setStrength] = useState({ score: 0, label: "", color: "" });
    const [isFocused, setIsFocused] = React.useState(false);
    const hasError = touched && error;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      
      if (showStrengthIndicator) {
        const newStrength = calculatePasswordStrength(newValue);
        setStrength(newStrength);
        onStrengthChange?.(newStrength.score);
      }
      
      onChange?.(e);
    };

    const inputElement = (
      <>
        <div className="relative">
          {showIcon && (
            <div className={cn(
              "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors z-10",
              hasError ? "text-red-400" : "text-gray-400",
              isFocused && !hasError && "text-primary-600"
            )}>
              <Lock className="h-4 w-4" />
            </div>
          )}
          <Input
            ref={ref}
            type={showPassword ? "text" : "password"}
            value={value}
            onChange={handleChange}
            className={cn(
              "transition-all",
              showIcon && "pl-10",
              "pr-10",
              hasError && "border-red-500 focus:ring-red-500",
              isFocused && !hasError && "border-primary-500 ring-2 ring-primary-500/20",
              className
            )}
            autoComplete="current-password"
            aria-invalid={hasError ? "true" : undefined}
            aria-describedby={hasError ? `${props.id}-error` : undefined}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          <button
            type="button"
            onClick={() => {
              const newValue = !showPassword;
              setShowPassword(newValue);
              onPasswordToggleChange?.(newValue);
            }}
            className={cn(
              "absolute inset-y-0 right-0 pr-3 flex items-center transition-colors",
              "hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded",
              hasError ? "text-red-400" : "text-gray-400"
            )}
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        
        {showStrengthIndicator && value && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Password strength:</span>
              {strength.label && (
                <span className={cn(
                  "font-medium",
                  strength.color === "bg-red-500" && "text-red-600",
                  strength.color === "bg-yellow-500" && "text-yellow-600",
                  strength.color === "bg-blue-500" && "text-blue-600",
                  strength.color === "bg-green-500" && "text-green-600"
                )}>
                  {strength.label}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    level <= strength.score
                      ? strength.color
                      : "bg-gray-200"
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </>
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

PasswordInput.displayName = "PasswordInput";