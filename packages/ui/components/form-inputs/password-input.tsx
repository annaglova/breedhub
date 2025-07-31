import React, { forwardRef, useState } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";
import { Eye, EyeOff, Lock, Check } from "lucide-react";

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
    
    const hasError = touched && !!error;
    const isValid = touched && !error && value && value !== "";

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
      <div className="group/field relative">
          <Input
            ref={ref}
            type={showPassword ? "text" : "password"}
            value={value}
            onChange={handleChange}
            className={cn(
              "peer transition-all duration-200 pr-10",
              props.disabled && "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed",
              hasError && "border-red-500 hover:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
              isValid && !props.disabled && "border-green-500 hover:border-green-600 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 pr-16",
              !hasError && !isValid && !props.disabled && "border-gray-300 hover:border-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
              showIcon && "pl-10",
              className
            )}
            autoComplete="current-password"
            aria-invalid={hasError ? "true" : undefined}
            aria-describedby={hasError ? `${props.id}-error` : undefined}
            {...props}
          />
          {showIcon && (
            <div className={cn(
              "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors z-10 top-0",
              hasError ? "text-red-400 peer-focus:text-red-500" : 
              isValid ? "text-green-500 peer-focus:text-green-600" :
              "text-gray-400 peer-focus:text-primary-600 peer-hover:text-gray-500"
            )}>
              <Lock className="h-4 w-4" />
            </div>
          )}
          {isValid && (
            <div className="absolute inset-y-0 right-10 pr-3 flex items-center pointer-events-none z-10 peer-focus:opacity-0">
              <Check className="h-4 w-4 text-green-500" />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              const newValue = !showPassword;
              setShowPassword(newValue);
              onPasswordToggleChange?.(newValue);
            }}
            className={cn(
              "absolute inset-y-0 right-0 pr-3 flex items-center transition-colors z-10",
              "hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded",
              hasError ? "text-red-400 peer-focus:text-red-500" : 
              "text-gray-400 peer-focus:text-primary-600"
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

PasswordInput.displayName = "PasswordInput";