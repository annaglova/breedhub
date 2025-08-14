/**
 * Example: Hierarchical Store Architecture for BreedHub
 * 
 * Демонструє повну ієрархічну структуру stores:
 * AppStore -> WorkspaceStore -> SpaceStore -> ViewStore -> DataStore
 */

import { 
  createAppStore,
  createSpaceStore,
  createDataStore,
  createWorkspaceStore,
  type Entity
} from '../index';

// Define entity types
interface Breed extends Entity {
  id: string;
  name: string;
  origin: string;
  description: string;
  temperament: string[];
}

interface Pet extends Entity {
  id: string;
  name: string;
  breedId: string;
  birthDate: Date;
  ownerId?: string;
  kennelId?: string;
}

/**
 * 1. Complete App Store with all features
 */
export function createCompleteAppExample() {
  // Create main app store for breeds
  const breedAppStore = createAppStore<Breed>('breedApp', {
    workspace: 'public',
    space: 'breeds',
    defaultView: 'grid',
    defaultViewMode: 'fullscreen',
    pageSize: 20,
  });

  // Use the store
  const store = breedAppStore();
  
  // Data operations
  store.addEntity({
    id: '1',
    name: 'Labrador',
    origin: 'Canada',
    description: 'Friendly family dog',
    temperament: ['Friendly', 'Active', 'Loyal'],
  });
  
  // View operations
  store.setViewType('grid');
  store.toggleDrawer(true);
  
  // Filter operations
  store.setFilter({
    field: 'origin',
    operator: 'equals',
    value: 'Canada',
  });
  
  // Pagination
  store.setPageSize(50);
  store.nextPage();
  
  return store;
}

/**
 * 2. Hierarchical Structure Example
 */
export function createHierarchicalExample() {
  // Level 1: Workspace Store
  const workspaceStore = createWorkspaceStore('mainWorkspace', 'private');
  
  // Level 2: Space Stores for different collections
  const spaces = {
    breeds: createSpaceStore<Breed>('breedsSpace', 'breeds'),
    pets: createSpaceStore<Pet>('petsSpace', 'pets'),
  };
  
  // Level 3: Different view contexts
  const viewContexts = {
    fullscreen: createDataStore<Breed>('fullscreenBreeds'),
    drawer: createDataStore<Breed>('drawerBreeds'),
    modal: createDataStore<Breed>('modalBreeds'),
  };
  
  // Orchestration logic
  const switchContext = (viewMode: 'fullscreen' | 'drawer' | 'modal') => {
    const workspace = workspaceStore();
    const space = spaces.breeds();
    const view = viewContexts[viewMode]();
    
    // Sync data between stores
    view.setAllEntities(space.computed.allEntities);
    
    // Apply workspace permissions
    if (workspace.computed.isPrivate) {
      // Apply private workspace logic
      view.setFilter({
        field: 'ownerId',
        operator: 'equals',
        value: 'currentUserId',
      });
    }
    
    return view;
  };
  
  return {
    workspace: workspaceStore,
    spaces,
    viewContexts,
    switchContext,
  };
}

/**
 * 3. Real-world Usage Pattern
 */
export function realWorldUsageExample() {
  // Initialize stores
  const stores = {
    workspace: createWorkspaceStore('app', 'public'),
    breeds: createSpaceStore<Breed>('breeds', 'breeds'),
    pets: createSpaceStore<Pet>('pets', 'pets'),
  };
  
  // Helper to get current active store
  const getActiveStore = () => {
    const workspace = stores.workspace();
    const currentSpace = workspace.currentSpace;
    
    switch (currentSpace) {
      case 'breeds':
        return stores.breeds();
      case 'pets':
        return stores.pets();
      default:
        return stores.breeds();
    }
  };
  
  // Navigation handler
  const navigateToSpace = (space: 'breeds' | 'pets') => {
    const workspace = stores.workspace();
    workspace.navigateToSpace(space);
    
    // Load data for the space
    const store = stores[space]();
    store.setLoading();
    
    // Simulate API call
    setTimeout(() => {
      if (space === 'breeds') {
        store.setAllEntities([
          { id: '1', name: 'Labrador', origin: 'Canada', description: '', temperament: [] },
          { id: '2', name: 'Poodle', origin: 'France', description: '', temperament: [] },
        ]);
      } else {
        store.setAllEntities([
          { id: '1', name: 'Max', breedId: '1', birthDate: new Date() },
          { id: '2', name: 'Bella', breedId: '2', birthDate: new Date() },
        ]);
      }
      store.setSuccess();
    }, 1000);
  };
  
  // Filter handler
  const applyGlobalFilter = (searchQuery: string) => {
    const activeStore = getActiveStore();
    activeStore.setSearchQuery(searchQuery);
  };
  
  // View switcher
  const switchView = (viewType: 'list' | 'grid' | 'table') => {
    const activeStore = getActiveStore();
    activeStore.setViewType(viewType);
  };
  
  return {
    stores,
    getActiveStore,
    navigateToSpace,
    applyGlobalFilter,
    switchView,
  };
}

/**
 * 4. Usage in React Component
 */
export function ReactComponentExample() {
  // This would be used in a React component
  
  /*
  import { useEffect } from 'react';
  import { realWorldUsageExample } from './hierarchical-store.example';
  
  function BreedHubApp() {
    const { stores, navigateToSpace, switchView } = realWorldUsageExample();
    
    // Subscribe to stores
    const workspace = stores.workspace();
    const breeds = stores.breeds();
    const pets = stores.pets();
    
    // Get computed values
    const currentSpace = workspace.computed.currentSpaceName;
    const filteredBreeds = breeds.computed.filteredEntities;
    const currentView = breeds.computed.currentViewType;
    
    useEffect(() => {
      // Initialize with breeds space
      navigateToSpace('breeds');
    }, []);
    
    return (
      <div>
        <nav>
          <button onClick={() => navigateToSpace('breeds')}>Breeds</button>
          <button onClick={() => navigateToSpace('pets')}>Pets</button>
        </nav>
        
        <div>
          <button onClick={() => switchView('list')}>List</button>
          <button onClick={() => switchView('grid')}>Grid</button>
          <button onClick={() => switchView('table')}>Table</button>
        </div>
        
        <main>
          {currentSpace === 'breeds' && (
            <BreedsView breeds={filteredBreeds} viewType={currentView} />
          )}
          {currentSpace === 'pets' && (
            <PetsView pets={pets.computed.filteredEntities} viewType={currentView} />
          )}
        </main>
      </div>
    );
  }
  */
}