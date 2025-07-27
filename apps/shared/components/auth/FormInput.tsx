import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { cn } from "@ui/lib/utils";
import { forwardRef, useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

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
            <div className={cn(
              "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors z-10",
              hasError ? "text-red-400" : "text-gray-400",
              isFocused && !hasError && "text-primary-600"
            )}>
              {icon}
            </div>
          )}
          <Input
            ref={ref}
            type={inputType}
            className={cn(
              "transition-all",
              icon && "pl-10",
              showPasswordToggle && "pr-10",
              hasError && "border-red-500 focus:ring-red-500",
              isFocused && !hasError && "border-primary-500 ring-2 ring-primary-500/20",
              className
            )}
            aria-invalid={hasError ? "true" : undefined}
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
                "absolute inset-y-0 right-0 pr-3 flex items-center transition-colors",
                "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500",
                hasError ? "text-red-400" : "text-gray-400"
              )}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {hasError && (
          <p id={`${props.id}-error`} className="text-sm text-red-600 animate-slideDown">
            <AlertCircle className="w-3 h-3 mr-1 inline-block" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";