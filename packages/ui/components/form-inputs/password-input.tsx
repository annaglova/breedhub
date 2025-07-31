import React, { forwardRef, useState } from "react";
import { Input } from "../input";
import { FormField } from "../form-field";
import { cn } from "@ui/lib/utils";
import { Eye, EyeOff, Lock, Check, Info, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip";

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

    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleToggleVisibility = () => {
      // Save cursor position before toggle
      const start = inputRef.current?.selectionStart || 0;
      const end = inputRef.current?.selectionEnd || 0;
      
      const newValue = !showPassword;
      setShowPassword(newValue);
      onPasswordToggleChange?.(newValue);
      
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(start, end);
          inputRef.current.focus();
        }
      });
    };

    const inputElement = (
      <div className="group/field relative">
          <Input
            ref={(el) => {
              inputRef.current = el;
              if (ref) {
                if (typeof ref === 'function') {
                  ref(el);
                } else {
                  ref.current = el;
                }
              }
            }}
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
            onClick={handleToggleVisibility}
            className={cn(
              "absolute inset-y-0 right-0 pr-3 flex items-center transition-colors z-10",
              "hover:text-gray-600 focus:outline-none rounded",
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
        <div className={cn("group", fieldClassName)}>
          {label && (
            <div className={cn(
              "flex items-center gap-1 mb-1",
              "text-base font-medium transition-colors",
              hasError ? "text-red-600" :
              isValid ? "text-green-600" :
              "text-gray-700 group-focus-within:text-primary-600"
            )}>
              <span>{label}</span>
              {required && <span className="text-warning-500">*</span>}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex items-center p-0 border-0 bg-transparent">
                      <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center">
                    <div className="text-sm">
                      <p className="font-medium mb-1">Password requirements:</p>
                      <ul className="space-y-0.5">
                        <li>• At least 8 characters</li>
                        <li>• One uppercase letter (A-Z)</li>
                        <li>• One lowercase letter (a-z)</li>
                        <li>• One number (0-9)</li>
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          {inputElement}
          <div className="h-5 mt-1">
            {hasError && error ? (
              <p className="text-warning-500 text-sm text-left flex items-center animate-fadeIn">
                <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>{error}</span>
              </p>
            ) : !hasError && helperText ? (
              <p className="text-gray-500 text-sm text-left">
                {helperText}
              </p>
            ) : null}
          </div>
        </div>
      );
    }

    return inputElement;
  }
);

PasswordInput.displayName = "PasswordInput";