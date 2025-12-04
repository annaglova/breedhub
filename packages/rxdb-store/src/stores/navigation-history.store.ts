import { signal, computed } from '@preact/signals-react';

const STORAGE_KEY = 'navigation_history';
const MAX_HISTORY_SIZE = 5;

/**
 * Navigation history entry
 */
export interface NavigationEntry {
  path: string;       // Full URL path (e.g., "/affenpinscher")
  title: string;      // Human-readable title (e.g., "Affenpinscher")
  entityType: string; // Entity type (e.g., "breed") - required for space-based history
  timestamp: number;  // When the page was visited
}

/**
 * History storage structure - per entity type
 */
interface HistoryStorage {
  [entityType: string]: NavigationEntry[];
}

/**
 * NavigationHistoryStore
 *
 * Stores the last 5 visited pages PER ENTITY TYPE in localStorage.
 * Used by NavigationButtons dropdown menu.
 *
 * Features:
 * - Per-space history (breeds have their own history, pets have their own, etc.)
 * - Persists to localStorage (survives page refresh)
 * - Max 5 entries per entity type
 * - Deduplicates consecutive visits to same page
 * - Works in PWA offline mode
 */
class NavigationHistoryStore {
  private static instance: NavigationHistoryStore;

  // Reactive state - all history by entity type
  private _historyByType = signal<HistoryStorage>({});

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
   * Add a page to navigation history for specific entity type
   *
   * @param path - URL path (e.g., "/affenpinscher")
   * @param title - Human-readable title
   * @param entityType - Entity type (e.g., "breed") - required
   */
  addEntry(path: string, title: string, entityType: string): void {
    const allHistory = this._historyByType.value;
    const typeHistory = allHistory[entityType] || [];

    // Don't add if same as most recent entry for this type
    if (typeHistory.length > 0 && typeHistory[0].path === path) {
      return;
    }

    // Capitalize first letter of each word for consistent display
    const formattedTitle = title
      .split(/[-\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    const newEntry: NavigationEntry = {
      path,
      title: formattedTitle,
      entityType,
      timestamp: Date.now(),
    };

    // Remove any existing entry with same path (to avoid duplicates)
    const filteredHistory = typeHistory.filter(entry => entry.path !== path);

    // Add new entry at the beginning, limit to MAX_HISTORY_SIZE
    const newTypeHistory = [newEntry, ...filteredHistory].slice(0, MAX_HISTORY_SIZE);

    this._historyByType.value = {
      ...allHistory,
      [entityType]: newTypeHistory,
    };

    this.saveToStorage();
  }

  /**
   * Get history for specific entity type (excluding current page)
   */
  getHistoryForType(entityType: string, currentPath?: string): NavigationEntry[] {
    const typeHistory = this._historyByType.value[entityType] || [];
    if (currentPath) {
      return typeHistory.filter(entry => entry.path !== currentPath);
    }
    return typeHistory;
  }

  /**
   * Check if entity type has any history
   */
  hasHistoryForType(entityType: string): boolean {
    const typeHistory = this._historyByType.value[entityType] || [];
    return typeHistory.length > 0;
  }

  /**
   * Clear history for specific entity type
   */
  clearHistoryForType(entityType: string): void {
    const allHistory = this._historyByType.value;
    const { [entityType]: _, ...rest } = allHistory;
    this._historyByType.value = rest;
    this.saveToStorage();
  }

  /**
   * Clear all navigation history
   */
  clearAllHistory(): void {
    this._historyByType.value = {};
    this.saveToStorage();
  }

  /**
   * Load history from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Handle old format (array) - clear it
        if (Array.isArray(parsed)) {
          this._historyByType.value = {};
          this.saveToStorage();
        } else if (typeof parsed === 'object') {
          this._historyByType.value = parsed;
        }
      }
    } catch (e) {
      console.warn('[NavigationHistoryStore] Failed to load from storage:', e);
      this._historyByType.value = {};
    }
  }

  /**
   * Save history to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._historyByType.value));
    } catch (e) {
      console.warn('[NavigationHistoryStore] Failed to save to storage:', e);
    }
  }
}

// Export singleton instance
export const navigationHistoryStore = NavigationHistoryStore.getInstance();
