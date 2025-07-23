import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { cn } from "@ui/lib/utils";
import { forwardRef, useState } from "react";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  touched?: boolean;
  showPasswordToggle?: boolean;
  onPasswordToggleChange?: (show: boolean) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, icon, error, touched, showPasswordToggle, onPasswordToggleChange, className, type, onBlur, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const inputType = showPasswordToggle && showPassword ? "text" : type;
    const hasError = touched && error;

    return (
      <div className="space-y-2">
        {label && (
          <Label 
            htmlFor={props.id} 
            className={cn(
              "text-base font-medium transition-colors",
              hasError && "text-red-600",
              isFocused && !hasError && "text-primary-600"
            )}
          >
            {label}
          </Label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <span 
                className={cn(
                  "text-base transition-colors",
                  hasError ? "text-red-400" : "text-gray-400",
                  isFocused && !hasError && "text-primary-600"
                )} 
                aria-hidden="true"
              >
                {icon}
              </span>
            </div>
          )}
          <Input
            ref={ref}
            type={inputType}
            className={cn(
              "text-base transition-all",
              icon && "pl-10",
              showPasswordToggle && "pr-10",
              hasError && "border-red-500 focus:ring-red-500",
              isFocused && !hasError && "border-primary-500 ring-2 ring-primary-500/20",
              className
            )}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${props.id}-error` : undefined}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => {
                const newValue = !showPassword;
                setShowPassword(newValue);
                onPasswordToggleChange?.(newValue);
              }}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-sm transition-colors",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500",
                hasError ? "text-red-400" : "text-gray-400"
              )}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <i className={cn("pi text-base", showPassword ? "pi-eye-slash" : "pi-eye")} />
            </button>
          )}
        </div>
        {hasError && (
          <p id={`${props.id}-error`} className="text-sm text-red-600 animate-slideDown">
            <i className="pi pi-exclamation-circle mr-1" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";