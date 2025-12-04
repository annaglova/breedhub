import { signal, computed } from '@preact/signals-react';

const STORAGE_KEY = 'navigation_history';
const MAX_HISTORY_SIZE = 5;

/**
 * Navigation history entry
 */
export interface NavigationEntry {
  path: string;       // Full URL path (e.g., "/affenpinscher")
  title: string;      // Human-readable title (e.g., "Affenpinscher")
  entityType?: string; // Optional entity type (e.g., "breed")
  timestamp: number;  // When the page was visited
}

/**
 * NavigationHistoryStore
 *
 * Stores the last 5 visited pages in localStorage for quick navigation.
 * Used by NavigationButtons dropdown menu.
 *
 * Features:
 * - Persists to localStorage (survives page refresh)
 * - Max 5 entries (removes oldest when adding new)
 * - Deduplicates consecutive visits to same page
 * - Works in PWA offline mode
 */
class NavigationHistoryStore {
  private static instance: NavigationHistoryStore;

  // Reactive state
  private _history = signal<NavigationEntry[]>([]);

  // Computed values
  history = computed(() => this._history.value);
  hasHistory = computed(() => this._history.value.length > 0);
  isEmpty = computed(() => this._history.value.length === 0);

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): NavigationHistoryStore {
    if (!NavigationHistoryStore.instance) {
      NavigationHistoryStore.instance = new NavigationHistoryStore();
    }
    return NavigationHistoryStore.instance;
  }

  /**
   * Add a page to navigation history
   *
   * @param path - URL path (e.g., "/affenpinscher" or "/breeds")
   * @param title - Human-readable title
   * @param entityType - Optional entity type for styling
   */
  addEntry(path: string, title: string, entityType?: string): void {
    const currentHistory = this._history.value;

    // Don't add if same as most recent entry
    if (currentHistory.length > 0 && currentHistory[0].path === path) {
      return;
    }

    const newEntry: NavigationEntry = {
      path,
      title,
      entityType,
      timestamp: Date.now(),
    };

    // Remove any existing entry with same path (to avoid duplicates)
    const filteredHistory = currentHistory.filter(entry => entry.path !== path);

    // Add new entry at the beginning, limit to MAX_HISTORY_SIZE
    const newHistory = [newEntry, ...filteredHistory].slice(0, MAX_HISTORY_SIZE);

    this._history.value = newHistory;
    this.saveToStorage();
  }

  /**
   * Remove a specific entry from history
   */
  removeEntry(path: string): void {
    this._history.value = this._history.value.filter(entry => entry.path !== path);
    this.saveToStorage();
  }

  /**
   * Clear all navigation history
   */
  clearHistory(): void {
    this._history.value = [];
    this.saveToStorage();
  }

  /**
   * Get history entries (excluding current page)
   */
  getHistoryExcludingCurrent(currentPath: string): NavigationEntry[] {
    return this._history.value.filter(entry => entry.path !== currentPath);
  }

  /**
   * Load history from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this._history.value = parsed;
        }
      }
    } catch (e) {
      console.warn('[NavigationHistoryStore] Failed to load from storage:', e);
      this._history.value = [];
    }
  }

  /**
   * Save history to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._history.value));
    } catch (e) {
      console.warn('[NavigationHistoryStore] Failed to save to storage:', e);
    }
  }
}

// Export singleton instance
export const navigationHistoryStore = NavigationHistoryStore.getInstance();
