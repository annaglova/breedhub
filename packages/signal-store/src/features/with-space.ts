import { createStoreFeature } from '../core/create-store-feature';
import type { StoreFeature } from '../types';

/**
 * Space types - різні колекції даних
 */
export type SpaceType = 'breeds' | 'pets' | 'kennels' | 'contacts' | 'litters' | 'events';

export interface SpaceConfig {
  id: string;
  type: SpaceType;
  name: string;
  icon?: string;
  url: string;
  defaultView: 'list' | 'grid' | 'table' | 'map';
  allowedViews: Array<'list' | 'grid' | 'table' | 'map'>;
  features: {
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
    canImport: boolean;
    canShare: boolean;
  };
}

export interface SpaceState {
  currentSpace: SpaceType | null;
  spaceConfigs: Map<SpaceType, SpaceConfig>;
  history: SpaceType[];
  activeFiltersCount: number;
}

/**
 * Feature for space management
 * Manages different data collections (breeds, pets, etc.)
 */
export function withSpace(
  spaces: SpaceConfig[] = []
): StoreFeature<SpaceState, {
  setCurrentSpace: (space: SpaceType) => void;
  navigateToSpace: (space: SpaceType) => void;
  goBack: () => void;
  registerSpace: (config: SpaceConfig) => void;
  updateSpaceConfig: (space: SpaceType, config: Partial<SpaceConfig>) => void;
  setActiveFiltersCount: (count: number) => void;
}> {
  const spaceConfigs = new Map<SpaceType, SpaceConfig>();
  spaces.forEach(config => {
    spaceConfigs.set(config.type, config);
  });

  return createStoreFeature({
    initialState: {
      currentSpace: null,
      spaceConfigs,
      history: [],
      activeFiltersCount: 0,
    },
    
    computed: {
      currentSpaceConfig: (state) => 
        state.currentSpace ? state.spaceConfigs.get(state.currentSpace) : null,
      
      currentSpaceName: (state) => {
        const config = state.currentSpace ? state.spaceConfigs.get(state.currentSpace) : null;
        return config?.name || '';
      },
      
      canGoBack: (state) => state.history.length > 1,
      
      availableSpaces: (state) => Array.from(state.spaceConfigs.values()),
      
      hasActiveFilters: (state) => state.activeFiltersCount > 0,
    },
    
    methods: (state, set) => ({
      setCurrentSpace: (space: SpaceType) => {
        set((draft) => {
          draft.currentSpace = space;
          return draft;
        });
      },
      
      navigateToSpace: (space: SpaceType) => {
        set((draft) => {
          if (draft.currentSpace !== space) {
            draft.history.push(space);
            draft.currentSpace = space;
          }
          return draft;
        });
      },
      
      goBack: () => {
        set((draft) => {
          if (draft.history.length > 1) {
            draft.history.pop();
            draft.currentSpace = draft.history[draft.history.length - 1] || null;
          }
          return draft;
        });
      },
      
      registerSpace: (config: SpaceConfig) => {
        set((draft) => {
          draft.spaceConfigs.set(config.type, config);
          return draft;
        });
      },
      
      updateSpaceConfig: (space: SpaceType, config: Partial<SpaceConfig>) => {
        set((draft) => {
          const existing = draft.spaceConfigs.get(space);
          if (existing) {
            draft.spaceConfigs.set(space, { ...existing, ...config });
          }
          return draft;
        });
      },
      
      setActiveFiltersCount: (count: number) => {
        set((draft) => {
          draft.activeFiltersCount = count;
          return draft;
        });
      },
    }),
  });
}

/**
 * Default space configurations for BreedHub
 */
export const DEFAULT_SPACES: SpaceConfig[] = [
  {
    id: 'breeds',
    type: 'breeds',
    name: 'Breeds',
    icon: 'dog',
    url: '/breeds',
    defaultView: 'grid',
    allowedViews: ['list', 'grid', 'table'],
    features: {
      canAdd: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
      canImport: true,
      canShare: true,
    },
  },
  {
    id: 'pets',
    type: 'pets',
    name: 'Pets',
    icon: 'heart',
    url: '/pets',
    defaultView: 'grid',
    allowedViews: ['list', 'grid', 'table'],
    features: {
      canAdd: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
      canImport: false,
      canShare: true,
    },
  },
  {
    id: 'kennels',
    type: 'kennels',
    name: 'Kennels',
    icon: 'home',
    url: '/kennels',
    defaultView: 'list',
    allowedViews: ['list', 'grid', 'map'],
    features: {
      canAdd: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
      canImport: true,
      canShare: true,
    },
  },
  {
    id: 'contacts',
    type: 'contacts',
    name: 'Contacts',
    icon: 'users',
    url: '/contacts',
    defaultView: 'list',
    allowedViews: ['list', 'table'],
    features: {
      canAdd: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
      canImport: true,
      canShare: false,
    },
  },
];