import React, { forwardRef, useState } from "react";
import { PasswordInput } from "../form-inputs/password-input";
import { cn } from "@ui/lib/utils";

interface AuthPasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  touched?: boolean;
  showLabel?: boolean;
  // Auth-специфічні пропси
  showForgotLink?: boolean;
  forgotLinkText?: string;
  forgotLinkHref?: string;
  showStrength?: boolean;
  isNewPassword?: boolean;
  minLength?: number;
  onPasswordToggleChange?: (show: boolean) => void;
}

/**
 * Password input спеціально для auth форм
 * Додаткові можливості:
 * - Посилання "Forgot password?"
 * - Різні autoComplete для login/signup
 * - Вбудована перевірка мінімальної довжини
 * - Опційний індикатор сили пароля
 */
export const AuthPasswordInput = forwardRef<HTMLInputElement, AuthPasswordInputProps>(
  ({ 
    label = "Password",
    error,
    touched = false,
    showLabel = true,
    showForgotLink = false,
    forgotLinkText = "Forgot password?",
    forgotLinkHref = "/forgot-password",
    showStrength = false,
    isNewPassword = false,
    minLength = 8,
    onPasswordToggleChange,
    onChange,
    value,
    className,
    ...props 
  }, ref) => {
    const [localError, setLocalError] = useState<string>("");

    // Валідація довжини пароля
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      
      // Перевірка мінімальної довжини тільки якщо є значення
      if (newValue && newValue.length < minLength) {
        setLocalError(`Password must be at least ${minLength} characters`);
      } else {
        setLocalError("");
      }
      
      onChange?.(e);
    };

    const displayError = error || localError;

    return (
      <div className="space-y-1">
        {showLabel && showForgotLink && (
          <div className="flex items-center justify-between">
            <label className="block text-base font-medium text-gray-700">
              {label}
            </label>
            <a 
              href={forgotLinkHref}
              className="text-sm text-primary-600 hover:text-primary-500 transition-colors"
              tabIndex={-1} // Щоб не переривати flow табуляції
            >
              {forgotLinkText}
            </a>
          </div>
        )}
        
        <PasswordInput
          ref={ref}
          label={showLabel && !showForgotLink ? label : undefined}
          error={displayError}
          touched={touched}
          autoComplete={isNewPassword ? "new-password" : "current-password"}
          showStrengthIndicator={showStrength && isNewPassword}
          onPasswordToggleChange={onPasswordToggleChange}
          value={value}
          onChange={handleChange}
          className={cn(
            "transition-all duration-200",
            className
          )}
          minLength={minLength}
          {...props}
        />
        
        {/* Додаткові підказки для нових паролів */}
        {isNewPassword && !value && !displayError && (
          <p className="text-xs text-gray-500 mt-1">
            At least {minLength} characters
          </p>
        )}
      </div>
    );
  }
);

AuthPasswordInput.displayName = "AuthPasswordInput";