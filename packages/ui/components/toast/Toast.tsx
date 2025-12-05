"use client";

import * as React from "react";
import { cn } from "@ui/lib/utils";
import { X, CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose: (id: string) => void;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="size-5" />,
  error: <XCircle className="size-5" />,
  info: <Info className="size-5" />,
  warning: <AlertTriangle className="size-5" />,
};

const styles: Record<ToastType, string> = {
  success: "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200",
  error: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200",
  info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200",
};

const iconStyles: Record<ToastType, string> = {
  success: "text-green-500 dark:text-green-400",
  error: "text-red-500 dark:text-red-400",
  info: "text-blue-500 dark:text-blue-400",
  warning: "text-yellow-500 dark:text-yellow-400",
};

/**
 * Toast - Individual toast notification component
 *
 * Features:
 * - Four visual styles: success, error, info, warning
 * - Optional action button
 * - Close button
 * - Slide-in animation from left
 */
export function Toast({ id, type, message, action, onClose }: ToastProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg",
        "animate-in slide-in-from-left-full duration-300",
        "min-w-[300px] max-w-[400px]",
        styles[type]
      )}
      role="alert"
    >
      {/* Icon */}
      <div className={cn("shrink-0", iconStyles[type])}>
        {icons[type]}
      </div>

      {/* Message */}
      <p className="flex-1 text-sm font-medium">{message}</p>

      {/* Action button */}
      {action && (
        <button
          onClick={() => {
            action.onClick();
            onClose(id);
          }}
          className={cn(
            "shrink-0 text-sm font-semibold underline underline-offset-2",
            "hover:opacity-80 transition-opacity"
          )}
        >
          {action.label}
        </button>
      )}

      {/* Close button */}
      <button
        onClick={() => onClose(id)}
        className={cn(
          "shrink-0 p-1 rounded-md",
          "hover:bg-black/10 dark:hover:bg-white/10",
          "transition-colors"
        )}
        aria-label="Close"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
