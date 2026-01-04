"use client";

import { cn } from "@ui/lib/utils";
import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";
import * as React from "react";

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
  success:
    "bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200",
  error:
    "bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200",
  info: "bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200",
  warning:
    "bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200",
};

const iconStyles: Record<ToastType, string> = {
  success: "text-slate-500 dark:text-slate-400",
  error: "text-slate-500 dark:text-slate-400",
  info: "text-slate-500 dark:text-slate-400",
  warning: "text-slate-500 dark:text-slate-400",
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
      <div className={cn("shrink-0", iconStyles[type])}>{icons[type]}</div>

      {/* Message */}
      <p className="flex-1 text-sm ">{message}</p>

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
