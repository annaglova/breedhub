import { signal, computed } from '@preact/signals-react';
import { dictionaryStore } from './dictionary-store.signal-store';
import { routeStore } from './route-store.signal-store';
import { appConfigReader } from './app-config-reader';

export interface IconConfig {
  name: string;
  source: 'lucide' | 'custom';
}

interface Workspace {
  id: string;
  icon: string | IconConfig;
  path: string;
  label: string;
  order?: number;
  spaces?: any;
  pages?: any;
}

interface AppConfig {
  id: string;
  data: {
    workspaces: Record<string, Workspace>;
    entities?: Record<string, any>;
    user_config?: Record<string, any>;
  };
}

class AppStore {
  private static instance: AppStore;

  appConfig = signal<AppConfig | null>(null);
  loading = signal<boolean>(true);
  error = signal<Error | null>(null);
  initialized = signal<boolean>(false);

  workspaces = computed(() => {
    if (!this.appConfig.value?.data?.workspaces) return [];
    return Object.entries(this.appConfig.value.data.workspaces).map(([key, workspace]) => ({
      ...workspace,
      configKey: key
    }));
  });

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
    if (this.initialized.value) return;

    console.log('[AppStore] Initializing...');

    try {
      this.loading.value = true;
      this.error.value = null;

      // 1. Instant load from localStorage (offline-first)
      const cachedConfig = appConfigReader.loadFromCache();
      if (cachedConfig) {
        this.appConfig.value = { id: 'cached', data: cachedConfig } as AppConfig;
        console.log('[AppStore] Loaded config from cache (v' + appConfigReader.getVersion() + ')');
        this.initialized.value = true;

        // Background update — don't block startup
        appConfigReader.fetchLatest().then(updated => {
          if (updated) {
            this.appConfig.value = { id: 'latest', data: appConfigReader.getConfig()! } as AppConfig;
            console.log('[AppStore] Config updated in background');
          }
        }).catch(() => {});
      } else {
        // No cache — must fetch (first-ever load)
        const updated = await appConfigReader.fetchLatest();
        if (updated) {
          this.appConfig.value = { id: 'latest', data: appConfigReader.getConfig()! } as AppConfig;
          console.log('[AppStore] Config loaded from server (first load)');
        }

        if (!this.appConfig.value) {
          console.error('[AppStore] App config not available');
          this.error.value = new Error('App config not available');
          return;
        }

        this.initialized.value = true;
      }

      // Initialize stores async (don't block app startup)
      this.initializeDictionaryStore();
      this.initializeRouteStore();

    } catch (err) {
      console.error('[AppStore] Failed to initialize:', err);
      this.error.value = err as Error;
    } finally {
      this.loading.value = false;
    }
  }

  private async initializeDictionaryStore() {
    try {
      await dictionaryStore.initialize();
    } catch (error) {
      console.error('[AppStore] DictionaryStore initialization failed:', error);
    }
  }

  private async initializeRouteStore() {
    try {
      await routeStore.initialize();
    } catch (error) {
      console.error('[AppStore] RouteStore initialization failed:', error);
    }
  }

  async reloadConfig() {
    this.initialized.value = false;
    await this.initialize();
  }
}

export const appStore = AppStore.getInstance();
