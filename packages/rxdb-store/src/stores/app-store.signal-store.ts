import { signal, computed } from '@preact/signals-react';
import { getDatabase } from '../services/database.service';
import { Subscription } from 'rxjs';
import { dictionaryStore } from './dictionary-store.signal-store';
import { routeStore } from './route-store.signal-store';
import { appConfigReader } from './app-config-reader';

// Types
export interface IconConfig {
  name: string;
  source: 'lucide' | 'custom';
}

interface Workspace {
  id: string;
  icon: string | IconConfig; // Support both string (legacy) and object (new)
  path: string;
  label: string;
  order?: number; // Order for display sorting
  spaces?: any;
}

interface AppConfig {
  id: string;
  data: {
    workspaces: Record<string, Workspace>;
  };
  deps?: string[];
  type?: string;
  caption?: string;
  version?: number;
}

// Universal entity interface
interface EntityData {
  id: string;
  [key: string]: any;
}

class AppStore {
  private static instance: AppStore;
  
  // Core signals
  appConfig = signal<AppConfig | null>(null);
  loading = signal<boolean>(true);
  error = signal<Error | null>(null);
  initialized = signal<boolean>(false);
  
  private dbSubscription: Subscription | null = null;
  
  // Computed values
  workspaces = computed(() => {
    // Return empty array if config not loaded yet
    if (!this.appConfig.value?.data?.workspaces) return [];
    
    // Convert workspaces object to array
    return Object.entries(this.appConfig.value.data.workspaces).map(([key, workspace]) => ({
      ...workspace,
      configKey: key
    }));
  });
  
  // Computed to check if data is really loaded
  isDataLoaded = computed(() => {
    return !this.loading.value && this.appConfig.value !== null;
  });
  
  private constructor() {
    this.initialize();
  }
  
  static getInstance(): AppStore {
    if (!AppStore.instance) {
      AppStore.instance = new AppStore();
    }
    return AppStore.instance;
  }
  
  async initialize() {
    // Prevent multiple initializations
    if (this.initialized.value) {
      return;
    }

    console.log('[AppStore] Initializing...');

    try {
      this.loading.value = true;
      this.error.value = null;

      // 1. Instant load from localStorage (offline-first)
      const cachedConfig = appConfigReader.loadFromCache();
      if (cachedConfig) {
        this.appConfig.value = { id: 'cached', data: cachedConfig } as AppConfig;
        console.log('[AppStore] Loaded config from cache (v' + appConfigReader.getVersion() + ')');
      }

      // 2. Fetch latest from static JSON (background)
      const updated = await appConfigReader.fetchLatest();
      if (updated) {
        this.appConfig.value = { id: 'latest', data: appConfigReader.getConfig()! } as AppConfig;
        console.log('[AppStore] Config updated from server');
      } else if (!cachedConfig) {
        // No cache AND no server — try RxDB as last resort (first-ever load)
        const db = await getDatabase();
        if (db.app_config) {
          const appConfigDoc = await db.app_config
            .findOne({ selector: { type: 'app' } })
            .exec();
          if (appConfigDoc) {
            const doc = appConfigDoc.toJSON() as AppConfig;
            this.appConfig.value = doc;
            // Cache for next time
            try {
              localStorage.setItem('breedhub_app_config', JSON.stringify({
                version: Date.now(),
                data: doc.data,
              }));
            } catch { /* localStorage full */ }
            console.log('[AppStore] Loaded config from RxDB (fallback)');
          }
        }
      }

      if (!this.appConfig.value) {
        console.error('[AppStore] App config not available');
        this.error.value = new Error('App config not available');
        return;
      }

      this.initialized.value = true;

      // Initialize stores асинхронно (без await!)
      // Не блокуємо AppStore initialization
      this.initializeDictionaryStore();
      this.initializeRouteStore();

    } catch (err) {
      console.error('[AppStore] Failed to initialize:', err);
      this.error.value = err as Error;
    } finally {
      this.loading.value = false;
    }
  }

  /**
   * Initialize DictionaryStore in background
   * Called after AppStore is initialized
   * Runs asynchronously - doesn't block app startup
   */
  private async initializeDictionaryStore() {
    try {
      await dictionaryStore.initialize();
    } catch (error) {
      console.error('[AppStore] DictionaryStore initialization failed:', error);
      // Don't throw - app can work without dictionaries cache
    }
  }

  /**
   * Initialize RouteStore in background
   * Called after AppStore is initialized
   * Runs asynchronously - doesn't block app startup
   */
  private async initializeRouteStore() {
    try {
      await routeStore.initialize();
    } catch (error) {
      console.error('[AppStore] RouteStore initialization failed:', error);
      // Don't throw - app can work without route cache
    }
  }
  
  async reloadConfig() {
    console.log('[AppStore] Reloading config...');
    this.initialized.value = false;
    await this.initialize();
  }
  
  getWorkspaceById(id: string) {
    return this.workspaces.value.find(w => w.id === id);
  }
  
  getWorkspaceByPath(path: string) {
    return this.workspaces.value.find(w => w.path === path);
  }
  
  dispose() {
    if (this.dbSubscription) {
      this.dbSubscription.unsubscribe();
      this.dbSubscription = null;
    }
  }
}

// Export singleton instance
export const appStore = AppStore.getInstance();