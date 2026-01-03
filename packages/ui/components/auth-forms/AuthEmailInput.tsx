import React, { forwardRef } from "react";
import { EmailInput } from "../form-inputs/email-input";
import { Mail } from "lucide-react";
import { cn } from "@ui/lib/utils";

interface AuthEmailInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  touched?: boolean;
  showLabel?: boolean;
  // Auth-специфічні пропси
  showForgotLink?: boolean;
  forgotLinkText?: string;
  forgotLinkHref?: string;
}

/**
 * Email input спеціально для auth форм
 * Додаткові можливості:
 * - Вбудована іконка Mail
 * - Опція для посилання "Forgot email?"
 * - Автоматичне приведення до lowercase
 * - Видалення пробілів
 */
export const AuthEmailInput = forwardRef<HTMLInputElement, AuthEmailInputProps>(
  ({ 
    label = "Email address",
    error,
    touched = false,
    showLabel = true,
    showForgotLink = false,
    forgotLinkText = "Forgot email?",
    forgotLinkHref = "/forgot-email",
    onChange,
    onBlur,
    value,
    className,
    ...props 
  }, ref) => {
    // Нормалізація email при введенні
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const normalizedValue = e.target.value.toLowerCase().trim();
      const newEvent = {
        ...e,
        target: {
          ...e.target,
          value: normalizedValue
        }
      };
      onChange?.(newEvent as React.ChangeEvent<HTMLInputElement>);
    };

    // Додаткова валідація при втраті фокусу
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Видаляємо зайві пробіли
      const trimmedValue = e.target.value.trim();
      if (trimmedValue !== e.target.value) {
        const newEvent = {
          ...e,
          target: {
            ...e.target,
            value: trimmedValue
          }
        };
        onChange?.(newEvent as React.ChangeEvent<HTMLInputElement>);
      }
      onBlur?.(e);
    };

    return (
      <div className="space-y-1">
        {showLabel && showForgotLink && (
          <div className="flex items-center justify-between">
            <label className="block text-base font-medium text-slate-700">
              {label}
            </label>
            <a 
              href={forgotLinkHref}
              className="text-sm text-primary-600 hover:text-primary-500 transition-colors"
            >
              {forgotLinkText}
            </a>
          </div>
        )}
        
        <EmailInput
          ref={ref}
          label={showLabel && !showForgotLink ? label : undefined}
          error={error}
          touched={touched}
          icon={<Mail className="w-4 h-4" />}
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            "transition-all duration-200",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

AuthEmailInput.displayName = "AuthEmailInput";