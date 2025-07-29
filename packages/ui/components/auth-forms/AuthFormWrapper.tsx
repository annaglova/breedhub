import React from "react";
import { cn } from "@ui/lib/utils";

interface AuthFormWrapperProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  isLoading?: boolean;
  className?: string;
  formId?: string;
}

/**
 * Обгортка для auth форм з спільною логікою:
 * - Блокування форми під час завантаження
 * - Анімація shake при помилках
 * - Консистентні відступи
 * - Автоматичний фокус на першому полі
 */
export function AuthFormWrapper({ 
  children, 
  onSubmit, 
  isLoading = false,
  className,
  formId = "auth-form"
}: AuthFormWrapperProps) {
  // Автоматичний фокус на першому інпуті при монтуванні
  React.useEffect(() => {
    const firstInput = document.querySelector(`#${formId} input:not([type="hidden"])`) as HTMLInputElement;
    if (firstInput) {
      firstInput.focus();
    }
  }, [formId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Блокуємо повторну відправку
    if (isLoading) return;
    
    try {
      await onSubmit(e);
    } catch (error) {
      // Анімація shake при помилці
      const form = document.getElementById(formId);
      form?.classList.add("animate-shake");
      setTimeout(() => form?.classList.remove("animate-shake"), 500);
    }
  };

  return (
    <form 
      id={formId}
      onSubmit={handleSubmit}
      className={cn(
        "mt-6 space-y-4",
        isLoading && "opacity-75 pointer-events-none",
        className
      )}
      noValidate // Використовуємо власну валідацію
    >
      {children}
    </form>
  );
}