import { signal, computed } from '@preact/signals-react';

/**
 * Toast types for different message styles
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * Toast message interface
 */
export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

/**
 * Options for creating a toast
 */
export interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 6000;
const MAX_TOASTS = 5;

/**
 * ToastStore - Manages ephemeral toast notifications
 *
 * Features:
 * - Singleton pattern with Preact signals
 * - Auto-dismiss after timeout
 * - Maximum visible toasts limit
 * - Support for action buttons
 * - Four toast types: success, error, info, warning
 *
 * Usage:
 * ```typescript
 * import { toast } from '@breedhub/rxdb-store';
 *
 * toast.success('Link copied!');
 * toast.error('Failed to save');
 * toast.info('Processing...', { duration: 2000 });
 * toast.warning('Unsaved changes', {
 *   action: { label: 'Save', onClick: handleSave }
 * });
 * ```
 */
class ToastStore {
  private static instance: ToastStore;

  // Reactive state
  private _toasts = signal<Toast[]>([]);

  // Computed: visible toasts (limited to MAX_TOASTS)
  readonly toasts = computed(() => this._toasts.value.slice(0, MAX_TOASTS));
  readonly hasToasts = computed(() => this._toasts.value.length > 0);

  private constructor() {}

  static getInstance(): ToastStore {
    if (!ToastStore.instance) {
      ToastStore.instance = new ToastStore();
    }
    return ToastStore.instance;
  }

  /**
   * Add a new toast notification
   */
  private add(type: ToastType, message: string, options?: ToastOptions): string {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const duration = options?.duration ?? (type === 'error' ? ERROR_DURATION : DEFAULT_DURATION);

    const toast: Toast = {
      id,
      type,
      message,
      duration,
      action: options?.action,
      createdAt: Date.now(),
    };

    // Add to beginning of array (newest first)
    this._toasts.value = [toast, ...this._toasts.value];

    // Auto-remove after duration (if duration > 0)
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }

    return id;
  }

  /**
   * Remove a toast by id
   */
  remove(id: string): void {
    this._toasts.value = this._toasts.value.filter(t => t.id !== id);
  }

  /**
   * Clear all toasts
   */
  clear(): void {
    this._toasts.value = [];
  }

  /**
   * Show success toast (green)
   */
  success(message: string, options?: ToastOptions): string {
    return this.add('success', message, options);
  }

  /**
   * Show error toast (red) - longer duration by default
   */
  error(message: string, options?: ToastOptions): string {
    return this.add('error', message, options);
  }

  /**
   * Show info toast (blue)
   */
  info(message: string, options?: ToastOptions): string {
    return this.add('info', message, options);
  }

  /**
   * Show warning toast (yellow)
   */
  warning(message: string, options?: ToastOptions): string {
    return this.add('warning', message, options);
  }
}

// Export singleton instance
export const toastStore = ToastStore.getInstance();

/**
 * Shorthand toast API for convenience
 *
 * Usage:
 * ```typescript
 * toast.success('Saved!');
 * toast.error('Failed');
 * ```
 */
export const toast = {
  success: (message: string, options?: ToastOptions) => toastStore.success(message, options),
  error: (message: string, options?: ToastOptions) => toastStore.error(message, options),
  info: (message: string, options?: ToastOptions) => toastStore.info(message, options),
  warning: (message: string, options?: ToastOptions) => toastStore.warning(message, options),
  remove: (id: string) => toastStore.remove(id),
  clear: () => toastStore.clear(),
};
