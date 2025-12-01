import { signal, computed } from '@preact/signals-react';

/**
 * LoadingStore - Global loading state management using signals
 *
 * Tracks active loading requests (URLs) and provides computed isLoading state.
 * Replaces Redux loadingSlice with signals approach.
 *
 * Based on Angular: libs/schema/ui/loading-bar-ui/loading/loading.service.ts
 */
class LoadingStore {
  private static instance: LoadingStore;

  // Active loading URLs
  private loadingUrls = signal<Set<string>>(new Set());

  // Computed: is anything loading
  isLoading = computed(() => this.loadingUrls.value.size > 0);

  // Mode for progress bar (indeterminate = animated, determinate = percentage)
  mode = signal<'determinate' | 'indeterminate'>('indeterminate');

  // Progress value (0-100) for determinate mode
  progress = signal<number>(0);

  private constructor() {}

  static getInstance(): LoadingStore {
    if (!LoadingStore.instance) {
      LoadingStore.instance = new LoadingStore();
    }
    return LoadingStore.instance;
  }

  /**
   * Start loading for a URL/key
   */
  startLoading(url: string): void {
    const current = new Set(this.loadingUrls.value);
    current.add(url);
    this.loadingUrls.value = current;
  }

  /**
   * Stop loading for a URL/key
   */
  stopLoading(url: string): void {
    const current = new Set(this.loadingUrls.value);
    current.delete(url);
    this.loadingUrls.value = current;
  }

  /**
   * Set determinate progress (0-100)
   */
  setProgress(value: number): void {
    this.progress.value = Math.max(0, Math.min(100, value));
    this.mode.value = 'determinate';
  }

  /**
   * Reset to indeterminate mode
   */
  resetProgress(): void {
    this.progress.value = 0;
    this.mode.value = 'indeterminate';
  }

  /**
   * Clear all loading states
   */
  clear(): void {
    this.loadingUrls.value = new Set();
    this.resetProgress();
  }
}

// Export singleton instance
export const loadingStore = LoadingStore.getInstance();
