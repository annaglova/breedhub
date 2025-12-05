"use client";

import * as React from "react";
import { useSignals } from "@preact/signals-react/runtime";
import { Toast } from "./Toast";

// Import types - actual store will be passed as prop or via context
export interface ToastData {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

export interface ToasterProps {
  /**
   * Signal containing array of toasts
   */
  toasts: { value: ToastData[] };
  /**
   * Function to remove a toast by id
   */
  onRemove: (id: string) => void;
  /**
   * Position of the toaster
   * @default "bottom-left"
   */
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
}

const positionStyles = {
  "bottom-left": "bottom-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "top-left": "top-4 left-4",
  "top-right": "top-4 right-4",
};

/**
 * Toaster - Container component that renders all toast notifications
 *
 * Usage:
 * ```tsx
 * import { toastStore } from '@breedhub/rxdb-store';
 *
 * function App() {
 *   return (
 *     <>
 *       <YourApp />
 *       <Toaster
 *         toasts={toastStore.toasts}
 *         onRemove={(id) => toastStore.remove(id)}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function Toaster({
  toasts,
  onRemove,
  position = "bottom-left",
}: ToasterProps) {
  useSignals();

  const toastList = toasts.value;

  if (toastList.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed z-[100] flex flex-col gap-2 ${positionStyles[position]}`}
      aria-live="polite"
      aria-label="Notifications"
    >
      {toastList.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          action={toast.action}
          onClose={onRemove}
        />
      ))}
    </div>
  );
}
