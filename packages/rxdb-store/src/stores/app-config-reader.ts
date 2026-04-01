/**
 * Lightweight config reader for the app.
 * Replaces appConfigStore's 3000+ record RxDB collection with:
 * 1. localStorage cache (instant, offline-first)
 * 2. Static JSON fetch (background update)
 *
 * No RxDB, no collection, no realtime subscription.
 */

const STORAGE_KEY = 'breedhub_app_config';
const CONFIG_URL = '/app-config.json';

export interface AppConfigData {
  version: number;
  exportedAt: string;
  configId: string;
  data: Record<string, any>;
}

class AppConfigReader {
  private configData: AppConfigData | null = null;

  /**
   * Load config from localStorage (instant, works offline).
   * Returns the config data or null if not cached.
   */
  loadFromCache(): Record<string, any> | null {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        this.configData = JSON.parse(cached);
        return this.configData!.data;
      }
    } catch (e) {
      console.warn('[AppConfigReader] Failed to read localStorage cache:', e);
    }
    return null;
  }

  /**
   * Fetch latest config from server (background).
   * Compares version — only updates if newer.
   * Returns true if config was updated.
   */
  async fetchLatest(): Promise<boolean> {
    try {
      const res = await fetch(CONFIG_URL);
      if (!res.ok) return false;

      const json: AppConfigData = await res.json();

      // Check if newer than cached
      const cachedVersion = this.configData?.version || 0;
      if (json.version > cachedVersion) {
        this.configData = json;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
        } catch {
          // localStorage full — still use in-memory
        }
        console.log(`[AppConfigReader] Config updated (v${json.version})`);
        return true;
      }

      return false;
    } catch {
      // Offline or network error — use cached version
      return false;
    }
  }

  /**
   * Get the current config data object.
   */
  getConfig(): Record<string, any> | null {
    return this.configData?.data || null;
  }

  /**
   * Get the current config version.
   */
  getVersion(): number {
    return this.configData?.version || 0;
  }
}

export const appConfigReader = new AppConfigReader();
