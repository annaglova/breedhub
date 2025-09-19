import { signal, computed } from '@preact/signals-react';
import { appConfigStore } from './app-config.signal-store';

// App config ID we're working with
const APP_CONFIG_ID = 'config_app_1757849573544';

// Types
interface Workspace {
  id: string;
  icon: string;
  path: string;
  label: string;
  spaces?: any;
}

interface AppConfig {
  id: string;
  data: {
    workspaces: Record<string, Workspace>;
  };
  deps?: string[];
}

// State
const appConfig = signal<AppConfig | null>(null);
const loading = signal(true);
const error = signal<Error | null>(null);

// Computed values
const workspaces = computed(() => {
  if (!appConfig.value?.data?.workspaces) return [];
  
  // Convert workspaces object to array
  return Object.entries(appConfig.value.data.workspaces).map(([key, workspace]) => ({
    ...workspace,
    configKey: key
  }));
});

// Initialize store
async function initialize() {
  try {
    loading.value = true;
    error.value = null;
    
    // Get the app config from app-config store
    const configs = await appConfigStore.readAllConfigs();
    const appConfigData = configs.find(c => c.id === APP_CONFIG_ID);
    
    if (!appConfigData) {
      throw new Error(`App config ${APP_CONFIG_ID} not found`);
    }
    
    appConfig.value = appConfigData as AppConfig;
    
    // If there are dependencies, we might need to load them too
    if (appConfigData.deps && appConfigData.deps.length > 0) {
      // For now, the workspaces are already embedded in the data
      // But we could load them separately if needed
    }
    
  } catch (err) {
    console.error('Failed to initialize app store:', err);
    error.value = err as Error;
  } finally {
    loading.value = false;
  }
}

// Reload config
async function reloadConfig() {
  await initialize();
}

// Get workspace by ID
function getWorkspaceById(id: string) {
  return workspaces.value.find(w => w.id === id);
}

// Get workspace by path
function getWorkspaceByPath(path: string) {
  return workspaces.value.find(w => w.path === path);
}

// Export store
export const appStore = {
  // State
  appConfig,
  loading,
  error,
  
  // Computed
  workspaces,
  
  // Actions
  initialize,
  reloadConfig,
  getWorkspaceById,
  getWorkspaceByPath,
};

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  initialize();
}