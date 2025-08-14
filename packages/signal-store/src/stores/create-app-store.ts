import { createSignalStore } from '../create-signal-store';
import { composeFeatures } from '../core/create-store-feature';
import { withEntities } from '../features/with-entities';
import { withFiltering, withFilteredEntities } from '../features/with-filtering';
import { withSelection } from '../features/with-entities';
import { withRequestStatus } from '../features/with-request-status';
import { withWorkspace } from '../features/with-workspace';
import { withSpace, DEFAULT_SPACES } from '../features/with-space';
import { withView } from '../features/with-view';
import { withPagination } from '../features/with-pagination';
import type { Entity } from '../types';

/**
 * Створює повний App Store з усіма features
 * Ієрархічна структура для BreedHub
 */
export function createAppStore<T extends Entity>(
  name: string,
  config?: {
    workspace?: 'public' | 'private';
    space?: 'breeds' | 'pets' | 'kennels' | 'contacts';
    defaultView?: 'list' | 'grid' | 'table' | 'map';
    defaultViewMode?: 'fullscreen' | 'drawer' | 'modal';
    pageSize?: number;
  }
) {
  const features = [
    // Data layer
    withEntities<T>(),
    withSelection<T>(),
    withFiltering<T>(),
    withFilteredEntities<T>(),
    withPagination(config?.pageSize || 20),
    withRequestStatus(),
    
    // View layer
    withView(config?.defaultView || 'list', config?.defaultViewMode || 'fullscreen'),
    
    // Space layer
    withSpace(DEFAULT_SPACES),
    
    // Workspace layer
    withWorkspace({ workspaceType: config?.workspace || 'public' }),
  ];

  return createSignalStore<T>(name, features);
}

/**
 * Створює DataStore - базовий store для даних
 */
export function createDataStore<T extends Entity>(name: string) {
  return createSignalStore<T>(name, [
    withEntities<T>(),
    withSelection<T>(),
    withFiltering<T>(),
    withFilteredEntities<T>(),
    withPagination(),
    withRequestStatus(),
  ]);
}

/**
 * Створює ViewStore - store для управління відображенням
 */
export function createViewStore(name: string) {
  return createSignalStore(name, [
    withView(),
  ]);
}

/**
 * Створює SpaceStore - store для управління простором
 */
export function createSpaceStore<T extends Entity>(
  name: string,
  spaceType: 'breeds' | 'pets' | 'kennels' | 'contacts'
) {
  const spaceConfig = DEFAULT_SPACES.find(s => s.type === spaceType);
  
  return createSignalStore<T>(name, [
    // Data features
    withEntities<T>(),
    withSelection<T>(),
    withFiltering<T>(),
    withFilteredEntities<T>(),
    withPagination(),
    withRequestStatus(),
    
    // View features
    withView(spaceConfig?.defaultView || 'list'),
    
    // Space feature
    withSpace([spaceConfig || DEFAULT_SPACES[0]]),
  ]);
}

/**
 * Створює WorkspaceStore - top-level store
 */
export function createWorkspaceStore(
  name: string,
  type: 'public' | 'private' = 'public'
) {
  return createSignalStore(name, [
    withWorkspace({ workspaceType: type }),
    withSpace(DEFAULT_SPACES),
  ]);
}

/**
 * Example: Complete hierarchical store setup for BreedHub
 */
export function createBreedHubStores() {
  // Top-level workspace stores
  const publicWorkspace = createWorkspaceStore('publicWorkspace', 'public');
  const privateWorkspace = createWorkspaceStore('privateWorkspace', 'private');
  
  // Space stores for different collections
  const breedsStore = createSpaceStore('breeds', 'breeds');
  const petsStore = createSpaceStore('pets', 'pets');
  const kennelsStore = createSpaceStore('kennels', 'kennels');
  const contactsStore = createSpaceStore('contacts', 'contacts');
  
  // View stores for different display modes
  const fullscreenView = createViewStore('fullscreenView');
  const drawerView = createViewStore('drawerView');
  const modalView = createViewStore('modalView');
  
  return {
    // Workspaces
    publicWorkspace,
    privateWorkspace,
    
    // Spaces
    breeds: breedsStore,
    pets: petsStore,
    kennels: kennelsStore,
    contacts: contactsStore,
    
    // Views
    views: {
      fullscreen: fullscreenView,
      drawer: drawerView,
      modal: modalView,
    },
    
    // Helper methods
    switchToSpace: (space: 'breeds' | 'pets' | 'kennels' | 'contacts') => {
      // Logic to switch active space
      console.log(`Switching to ${space} space`);
    },
    
    switchWorkspace: (type: 'public' | 'private') => {
      // Logic to switch workspace
      console.log(`Switching to ${type} workspace`);
    },
  };
}